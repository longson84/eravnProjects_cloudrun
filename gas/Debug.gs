// Các function để debug, log

function logProjectTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  Logger.log("Tổng số trigger: " + triggers.length);
  
  // Duyệt qua từng trigger và in ra tên hàm được gắn trigger
  triggers.forEach(function(trigger, index) {
    Logger.log("Trigger " + (index + 1) + " đang chạy hàm: " + trigger.getHandlerFunction());
  });
}


function deleteAllTriggers() {

  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  
  // Duyệt qua từng trigger và tiến hành xóa
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
    count++;
  });
  
  Logger.log("Đã xóa thành công " + count + " trigger trong dự án.");
}