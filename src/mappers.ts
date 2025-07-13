import * as xpath from "xpath";
import { DOMParser } from "xmldom";
import JSONPath from "JSONPath";

interface MapperParameters {
  [key: string]: any;
}

interface Mapper {
  map(value: string): string;
}

export class StaticMapper implements Mapper {
	private mapping: { [key: string]: string };

	constructor(parameters: MapperParameters) {
		this.mapping = parameters.mapping;
	}

	map(value: string): string {
		return this.mapping[value] || value;
	}
}

export class RegexMapper implements Mapper {
	private regexp: RegExp;
	private capture: string;

	constructor(parameters: MapperParameters) {
		this.regexp = new RegExp(parameters.regexp);
		this.capture = parameters.capture || "1";
	}

	map(value: string): string {
		const matches = this.regexp.exec(value);

		if (matches !== null && this.capture in matches) {
			return (matches as any)[this.capture];
		}

		return value;
	}
}

export class XPathMapper implements Mapper {
	private xpath: string;
	private index: number;

	constructor(parameters: MapperParameters) {
		this.xpath = parameters.xpath;
		this.index = parameters.index || 0;
	}

	map(value: string): string {
		const document = new DOMParser().parseFromString(value);
		const result = xpath.select(this.xpath, document);

		if (typeof result === "string") {
			return result;
		} else if (result instanceof Array && result.length > this.index) {
			return (result[this.index] as any).data;
		}

		return value;
	}
}

export class JPathMapper implements Mapper {
	private jpath: string;
	private index: number;

	constructor(parameters: MapperParameters) {
		this.jpath = parameters.jpath;
		this.index = parameters.index || 0;
	}

	map(value: string): string {
		let result: any = 'inconclusive';
		let json: any;

		try {
			json = JSON.parse(value);
		} catch (e) {
			return result;
		}

		if (typeof json !== 'object') {
			return result;
		} else {
			result = JSONPath({path: this.jpath, json: json});
			if (result instanceof Array && result.length > this.index) {
				result = result[this.index];
			}
			if (result instanceof Object) {
				result = JSON.stringify(result);
			}
		}

		return result;
	}
}

export class EvalMapper implements Mapper {
	private exp: string;
	public state?: any;

	constructor(parameters: MapperParameters) {
		this.exp = parameters.expression;
	}

	map(value: string): string {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = eval(this.exp);
		return result;
	}
}
