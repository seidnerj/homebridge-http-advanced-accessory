import request from 'request';
import pollingtoevent from 'polling-to-event';
import * as mappers from './mappers';
import { registerCustomTypes } from './HomeKitExtensionTypes';

interface Action {
	url: string;
	httpMethod: string;
	body: string;
	resultOnError?: any;
	mappers?: any[];
	inconclusive?: Action;
}

interface Config {
	name: string;
	service: string;
	optionCharacteristic?: string[];
	props?: { [key: string]: any };
	forceRefreshDelay?: number;
	setterDelay?: number;
	debug?: boolean;
	urls?: { [key: string]: any };
	username?: string;
	password?: string;
	immediately?: boolean;
	uriCallsDelay?: number;
}

let Service: any, Characteristic: any;

export = function (homebridge: any) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	
	// Register custom types
	registerCustomTypes(homebridge);
	
	homebridge.registerAccessory("homebridge-http-advanced-accessory", "HttpAdvancedAccessory", HttpAdvancedAccessory);
};

class HttpAdvancedAccessory {
	private log: any;
	private name: string;
	private service: string;
	private optionCharacteristic: string[];
	private props: { [key: string]: any };
	private forceRefreshDelay: number;
	private setterDelay: number;
	private enableSet: boolean;
	private statusEmitters: any[];
	private state: { [key: string]: any };
	private uriCalls: number;
	private uriCallsDelay: number;
	private debug?: boolean;
	private urls: { [key: string]: Action };
	private auth: {
		username: string;
		password: string;
		immediately: boolean;
	};

	constructor(log: any, config: Config) {
		this.log = log;
		this.name = config.name;
		this.service = config.service;
		this.optionCharacteristic = config.optionCharacteristic || [];
		this.props = config.props || {};
		this.forceRefreshDelay = config.forceRefreshDelay || 0;
		this.setterDelay = config.setterDelay || 0;
		this.enableSet = true;
		this.statusEmitters = [];
		this.state = {};
		this.uriCalls = 0;
		this.uriCallsDelay = config.uriCallsDelay || 0;
		this.debug = config.debug || false;

		const createAction = (action: Action, actionDescription: any): void => {
			action.url = actionDescription.url;
			action.httpMethod = actionDescription.httpMethod || "GET";
			action.body = actionDescription.body || "";
			action.resultOnError = actionDescription.resultOnError;
			if (actionDescription.mappers) {
				action.mappers = [];
				actionDescription.mappers.forEach((matches: any) => {
					switch (matches.type) {
						case "regex":
							action.mappers!.push(new mappers.RegexMapper(matches.parameters));
							break;
						case "static":
							action.mappers!.push(new mappers.StaticMapper(matches.parameters));
							break;
						case "xpath":
							action.mappers!.push(new mappers.XPathMapper(matches.parameters));
							break;
						case "jpath":
							action.mappers!.push(new mappers.JPathMapper(matches.parameters));
							break;
						case "eval":
							const mapper = new mappers.EvalMapper(matches.parameters);
							mapper.state = this.state;
							action.mappers!.push(mapper);
							break;
					}
				});
			}
			if (actionDescription.inconclusive) {
				action.inconclusive = {} as Action;
				createAction(action.inconclusive, actionDescription.inconclusive);
			}
		};

		this.urls = {};
		if (config.urls) {
			for (const actionName in config.urls) {
				if (!config.urls.hasOwnProperty(actionName)) continue;
				this.urls[actionName] = {} as Action;
				createAction(this.urls[actionName], config.urls[actionName]);
			}
		}

		this.auth = {
			username: config.username || "",
			password: config.password || "",
			immediately: true
		};

		if ("immediately" in config) {
			this.auth.immediately = config.immediately!;
		}
	}

	private debugLog(...args: any[]): void {
		if (this.debug) {
			this.log.apply(this, args);
		}
	}

	private httpRequest(url: string, body: string, httpMethod: string, callback: (error: any, response: any, body: any) => void): void {
		setTimeout(() => {
			request({
				url: url,
				body: body,
				method: httpMethod,
				auth: {
					user: this.auth.username,
					pass: this.auth.password,
					sendImmediately: this.auth.immediately
				},
				headers: {
					Authorization: "Basic " + Buffer.from(this.auth.username + ":" + this.auth.password).toString("base64")
				}
			}, (error: any, response: any, body: any) => {
				this.uriCalls--;
				this.debugLog("httpRequest ended, current uriCalls is " + this.uriCalls);
				callback(error, response, body);
			});
		}, this.uriCalls * this.uriCallsDelay);
		
		this.uriCalls++;
		this.debugLog("httpRequest called, current uriCalls is " + this.uriCalls); 
	}

	private applyMappers(mappersArray: any[], str: string): string {
		if (mappersArray && mappersArray.length > 0) {
			this.debugLog("Applying mappers on " + str);
			mappersArray.forEach((mapper, index) => {
				const newString = mapper.map(str);
				this.debugLog("Mapper " + index + " mapped " + str + " to " + newString);
				str = newString;
			});

			this.debugLog("Mapping result is " + str);
		}

		return str;
	}

	private stringInject(str: string, data: any[] | { [key: string]: any }): string | false {
		if (typeof str === 'string' && Array.isArray(data)) {
			return str.replace(/({\d})/g, (i: string) => {
				const index = i.replace(/{/, '').replace(/}/, '');
				return data[parseInt(index)] || i;
			});
		} else if (typeof str === 'string' && data && typeof data === 'object') {
			const objData = data as { [key: string]: any };
			return str.replace(/({([^}]+)})/g, (i: string) => {
				const keyName = i.replace(/{/, '').replace(/}/, '');
				if (!objData[keyName]) {
					return i;
				}
				return objData[keyName];
			});
		}
		return false;
	}

	//Start
	identify(callback: (error: any) => void): void {
		this.log("Identify requested!");
		callback(null);
	}
	getName(callback: (error: any, name: string) => void): void {
		this.log("getName :", this.name);
		const error = null;
		callback(error, this.name);
	}
	
	getServices(): any[] {
		const getDispatch = (callback: (error: any, data?: any) => void, action?: Action): void => {
			if (typeof action === "undefined") {
				callback(null);
				return;
			}
			this.debugLog("getDispatch function called for url: %s", action.url);
			this.httpRequest(action.url, action.body, action.httpMethod, (error: any, _response: any, responseBody: any) => {
				if (error && action.resultOnError != null) {
					this.debugLog("GetState function failed BUT using resultOnError=%s: %s", action.resultOnError, error.message);
					callback(null, action.resultOnError);
				} else if (error) {
					this.log("GetState function failed: %s", error.message);
					callback(error);
				} else {
					this.debugLog("received response from action: %s", action.url);
					let state = responseBody;
					state = this.applyMappers(action.mappers || [], state);
					if (state == "inconclusive") {
						this.log(`Inconclusive mapping of response "${responseBody}"`);
						if (action.inconclusive) {
							this.debugLog("Response inconclusive and trying the action specified for this condition.");
							getDispatch(callback, action.inconclusive);
						} else {
							this.debugLog("Response inconclusive with no further action specified for this condition.");
						}
					} else {
						this.debugLog("We have a value: %s, int: %d", state, parseInt(state));
						callback(null, state);
					}
				}
			});
		};

		const setDispatch = (value: any, callback: ((error?: any) => void) | null, characteristic: any): void => {
			if (this.enableSet === false) { 
				if (callback) callback();
			} else {
				const actionName = "set" + characteristic.displayName.replace(/\s/g, '');
				this.debugLog("setDispatch:actionName:value: ", actionName, value); 
				const action = this.urls[actionName];
				if (!action || !action.url) {
					if (callback) callback(null);
					return;
				}
				const state = this.state;
				let body = action.body;
				const mappedValue = this.applyMappers(action.mappers || [], value);
				let url = eval('`' + action.url + '`').replace(/{value}/gi, mappedValue);
				if (body) {
					body = eval('`' + body + '`').replace(/{value}/gi, mappedValue);
				}

				this.httpRequest(url, body, action.httpMethod, (error: any, _response: any, _responseBody: any) => {
					if (error) {
						this.log("SetState function failed: %s", error.message);
					}
					if (callback) {
						if (error) {
							callback(error);
						} else {
							// https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/Characteristic.js#L34 setter callback takes only error as arg
							callback(); 
						}	
					}
				});
			}
		};

		// you can OPTIONALLY create an information service if you wish to override / the default values for things like serial number, model, etc.
		const informationService = new (Service as any).AccessoryInformation();

		informationService
			.setCharacteristic((Characteristic as any).Manufacturer, "Custom Manufacturer")
			.setCharacteristic((Characteristic as any).Model, "HTTP Accessory Model")
			.setCharacteristic((Characteristic as any).SerialNumber, "HTTP Accessory Serial Number");

		const newService = new (Service as any)[this.service](this.name);

		const counters: any[] = [];
		const optionCounters: any[] = [];

		const makeHelper = (characteristic: any): { getter: (callback: (error: any, data?: any) => void) => void; setter: (value: any, callback: (error?: any) => void) => void } => {
			let timeoutID: NodeJS.Timeout | null = null;
			return {
				getter: (callback: (error: any, data?: any) => void): void => {
					const actionName = "get" + characteristic.displayName.replace(/\s/g, '');
					if (actionName === "getName") {
						callback(null, this.name);
						return;
					}
					const action = this.urls[actionName];
					if (this.forceRefreshDelay === 0) { 
						getDispatch((error: any, data: any) => {
							this.debugLog(actionName + " getter function returned with data: " + data);
							this.enableSet = false;
							(this.state as any)[actionName] = data;
							characteristic.setValue(data);
							this.enableSet = true;
							callback(error, data);
						}, action); 
					} else {
						callback(null, (this.state as any)[actionName] || characteristic.value);

						if (typeof (this.statusEmitters as any)[actionName] !== "undefined") {
							this.debugLog(actionName + " returning cached data: " + (this.state as any)[actionName]);
							return;
						} 
						this.debugLog("creating new emitter for " + actionName);

						(this.statusEmitters as any)[actionName] = pollingtoevent((done: (error: any, data?: any) => void) => {
							this.debugLog("requested update for action " + actionName);
							getDispatch(done, action);
						}, { 
							longpolling: true, 
							interval: this.forceRefreshDelay * 1000, 
							longpollEventName: actionName 
						});

						(this.statusEmitters as any)[actionName].on(actionName, (data: any) => {
							this.debugLog(actionName + " emitter returned data: " + data);
							this.enableSet = false;
							
							if (['int', 'uint16', 'uint8', 'uint32', 'uint64'].includes(characteristic.props.format))
								data = parseInt(data);
							if ('float' === characteristic.props.format)
								data = parseFloat(data);

							(this.state as any)[actionName] = data;
							characteristic.setValue(data);
							this.enableSet = true;
						});

						(this.statusEmitters as any)[actionName].on("error", (err: any, data: any) => {
							this.log("Emitter errored: %s. with data %j", err, data);
						});
					}
				},
				setter: (value: any, callback: (error?: any) => void): void => { 
					if (this.enableSet === false || this.setterDelay === 0) {
						// no setter delay or internal set - do it immediately 
						this.debugLog("updating " + characteristic.displayName.replace(/\s/g, '') + " with value " + value);
						setDispatch(value, callback, characteristic);
					} else {
						// making a request and setter delay is set
						// optimistic callback calling if we have a delay
						// this also means we won't be getting back any errors in homekit
						callback();
						
						this.debugLog("updating " + characteristic.displayName.replace(/\s/g, '') + " with value " + value + " in " + this.setterDelay + "ms");
						if (timeoutID !== null) {
							clearTimeout(timeoutID); 
							this.debugLog("clearing timeout for setter " + characteristic.displayName.replace(/\s/g, ''));
						}
						timeoutID = setTimeout(() => {
							setDispatch(value, null, characteristic);
							timeoutID = null;
						}, this.setterDelay);
					}	
				}
			};
		};

		for (const characteristicIndex in newService.characteristics) {
			const characteristic = (newService.characteristics as any)[characteristicIndex];
			const compactName = characteristic.displayName.replace(/\s/g, '');
			
			if (compactName in this.props) {
				characteristic.setProps(this.props[compactName]);
			}
			
			(counters as any)[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', (counters as any)[characteristicIndex].getter.bind(this));
			characteristic.on('set', (counters as any)[characteristicIndex].setter.bind(this));
		}

		for (const characteristicIndex in newService.optionalCharacteristics) {
			const characteristic = (newService.optionalCharacteristics as any)[characteristicIndex];
			const compactName = characteristic.displayName.replace(/\s/g, '');
			
			if (compactName in this.props) {
				characteristic.setProps(this.props[compactName]);
			}
			
			if (this.optionCharacteristic.indexOf(compactName) === -1) {
				continue;
			}

			(optionCounters as any)[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', (optionCounters as any)[characteristicIndex].getter.bind(this));
			characteristic.on('set', (optionCounters as any)[characteristicIndex].setter.bind(this));

			newService.addCharacteristic(characteristic);
		}

		return [informationService, newService];
	}
};
