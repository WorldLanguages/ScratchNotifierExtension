window.onload = function() {

  var notifySettings = JSON.parse(localStorage.getItem("notifySettings"));

  var notifyCheckboxes = document.getElementsByClassName("notifycheckbox");
  for (i = 0; i < notifyCheckboxes.length; i++) {
    if(notifySettings[notifyCheckboxes[i].id] === true) notifyCheckboxes[i].checked = true;

    notifyCheckboxes[i].onclick = function(x) {
      var id = x.path[0].id;
      var checked = x.path[0].checked;
      notifySettings[id] = checked;
      localStorage.setItem("notifySettings", JSON.stringify(notifySettings));
      chrome.runtime.sendMessage({settings: "update"}, function(response) {
        if(response.updated === true) console.log("Updated successfully");
      });
    }
  }

}
