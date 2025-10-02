class Device {
  constructor(androidId, info) {
    this.deviceId = androidId;        // ID duy nhất
    this.info = info;                 // Thông tin khác
    this.lastSeen = new Date();       // Thời điểm cuối cùng nhận tín hiệu
    this.location = null;             // { lat, lng, updatedAt }
    this.appLocked = false;           // Trạng thái app có bị khóa không
    this.alarmOn = false;             // Trạng thái cảnh báo âm báo
  }
}
