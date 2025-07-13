const PushOnUUID = '74fefc26-4f40-11e7-b114-b2f933d5fe66';
const RotationSpeedIRUUID = '74ff01ee-4f40-11e7-b114-b2f933d5fe66';
const VolumeIRUUID = 'be9ac330-4f43-11e7-b114-b2f933d5fe66';
const MuteIRUUID = 'be9ac772-4f43-11e7-b114-b2f933d5fe66';
const FanIRUUID = '74ff031a-4f40-11e7-b114-b2f933d5fe66';
const TVIRUUID = 'be9ac984-4f43-11e7-b114-b2f933d5fe66';

function createPushOn(Characteristic: any) {
  function PushOn() {
    Characteristic.call(this, 'On', PushOnUUID);
    this.setProps({
      format: Characteristic.Formats.BOOL,
      perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = 0;
  }
  
  PushOn.prototype = Object.create(Characteristic.prototype);
  PushOn.prototype.constructor = PushOn;
  PushOn.UUID = PushOnUUID;
  
  return PushOn;
}

function createRotationSpeedIR(Characteristic: any) {
  function RotationSpeedIR() {
    Characteristic.call(this, 'Rotation Speed', RotationSpeedIRUUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: Characteristic.Units.PERCENTAGE,
      maxValue: 2,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = 1;
  }
  
  RotationSpeedIR.prototype = Object.create(Characteristic.prototype);
  RotationSpeedIR.prototype.constructor = RotationSpeedIR;
  RotationSpeedIR.UUID = RotationSpeedIRUUID;
  
  return RotationSpeedIR;
}

function createVolumeIR(Characteristic: any) {
  function VolumeIR() {
    Characteristic.call(this, 'Volume', VolumeIRUUID);
    this.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: Characteristic.Units.PERCENTAGE,
      maxValue: 2,
      minValue: 0,
      minStep: 1,
      perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = 1;
  }
  
  VolumeIR.prototype = Object.create(Characteristic.prototype);
  VolumeIR.prototype.constructor = VolumeIR;
  VolumeIR.UUID = VolumeIRUUID;
  
  return VolumeIR;
}

function createMuteIR(Characteristic: any) {
  function MuteIR() {
    Characteristic.call(this, 'Mute', MuteIRUUID);
    this.setProps({
      format: Characteristic.Formats.BOOL,
      perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = 0;
  }
  
  MuteIR.prototype = Object.create(Characteristic.prototype);
  MuteIR.prototype.constructor = MuteIR;
  MuteIR.UUID = MuteIRUUID;
  
  return MuteIR;
}

function createFanIR(Service: any, Characteristic: any) {
  function FanIR(displayName?: string, subtype?: string) {
    Service.call(this, displayName || 'Fan IR', FanIRUUID, subtype);
    
    this.addCharacteristic(Characteristic.PushOn);
    this.addOptionalCharacteristic(Characteristic.RotationSpeedIR);
  }
  
  FanIR.prototype = Object.create(Service.prototype);
  FanIR.prototype.constructor = FanIR;
  FanIR.UUID = FanIRUUID;
  
  return FanIR;
}

function createTVIR(Service: any, Characteristic: any) {
  function TVIR(displayName?: string, subtype?: string) {
    Service.call(this, displayName || 'TV IR', TVIRUUID, subtype);
    
    this.addCharacteristic(Characteristic.PushOn);
    this.addOptionalCharacteristic(Characteristic.VolumeIR);
    this.addOptionalCharacteristic(Characteristic.MuteIR);
  }
  
  TVIR.prototype = Object.create(Service.prototype);
  TVIR.prototype.constructor = TVIR;
  TVIR.UUID = TVIRUUID;
  
  return TVIR;
}

export function registerCustomTypes(homebridge: any) {
  const Service = homebridge.hap.Service;
  const Characteristic = homebridge.hap.Characteristic;
  
  Characteristic.PushOn = createPushOn(Characteristic);
  Characteristic.RotationSpeedIR = createRotationSpeedIR(Characteristic);
  Characteristic.VolumeIR = createVolumeIR(Characteristic);
  Characteristic.MuteIR = createMuteIR(Characteristic);
  
  Service.FanIR = createFanIR(Service, Characteristic);
  Service.TVIR = createTVIR(Service, Characteristic);
  
  return { Service, Characteristic };
}