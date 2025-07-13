declare module 'homebridge' {
  export interface Logger {
    (message: string, ...args: any[]): void;
    apply(thisArg: any, args: any[]): void;
  }

  export interface API {
    registerAccessory(pluginName: string, accessoryName: string, constructor: any): void;
  }

  export interface Service {
    new (displayName?: string, subtype?: string): Service;
    addCharacteristic(characteristic: any): Service;
    addOptionalCharacteristic(characteristic: any): Service;
    setCharacteristic(characteristic: any, value: any): Service;
    characteristics: any[];
    optionalCharacteristics: any[];
  }

  export interface Characteristic {
    new (displayName: string, UUID: string): Characteristic;
    displayName: string;
    value: any;
    props: any;
    on(event: string, callback: Function): void;
    setProps(props: any): void;
    setValue(value: any): void;
    UUID: string;
    static Formats: {
      BOOL: string;
      FLOAT: string;
      UINT8: string;
      UINT16: string;
      UINT32: string;
      UINT64: string;
    };
    static Units: {
      PERCENTAGE: string;
    };
    static Perms: {
      READ: string;
      WRITE: string;
      NOTIFY: string;
    };
  }

  export interface DynamicPlatformPlugin {}
  export interface PlatformAccessory {}
  export interface PlatformConfig {}
}

declare module 'polling-to-event' {
  function pollingtoevent(fn: Function, options: any): any;
  export = pollingtoevent;
}

declare module 'JSONPath' {
  function JSONPath(options: { path: string; json: any }): any;
  export = JSONPath;
}

declare module 'hap-nodejs' {
  export interface Characteristic {
    new (displayName: string, UUID: string): Characteristic;
    displayName: string;
    value: any;
    props: any;
    on(event: string, callback: Function): void;
    setProps(props: any): void;
    setValue(value: any): void;
    UUID: string;
    static Formats: {
      BOOL: string;
      FLOAT: string;
      UINT8: string;
      UINT16: string;
      UINT32: string;
      UINT64: string;
    };
    static Units: {
      PERCENTAGE: string;
    };
    static Perms: {
      READ: string;
      WRITE: string;
      NOTIFY: string;
    };
  }

  export interface Service {
    new (displayName?: string, UUID?: string, subtype?: string): Service;
    addCharacteristic(characteristic: any): Service;
    addOptionalCharacteristic(characteristic: any): Service;
    setCharacteristic(characteristic: any, value: any): Service;
    characteristics: any[];
    optionalCharacteristics: any[];
  }
}