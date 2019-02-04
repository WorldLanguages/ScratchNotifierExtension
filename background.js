setInterval(getMessageCount, 10000);
getData();
setInterval(getData, 120000);
notifID = -1;
msgNum = Infinity;
loggedIn = false;
firstRun = true;
var alreadySeen = [];
var notifOnClick = {};
getMsgCountInt = null;
chrome.browserAction.setBadgeBackgroundColor({
  color: "red"
});

var notifySettings = JSON.parse(localStorage.getItem("notifySettings"));
if (notifySettings === null) {
  var notifySettings = {};
  notifySettings.addcomment = true;
  notifySettings.forumpost = true;
  notifySettings.loveproject = true;
  notifySettings.favoriteproject = true;
  notifySettings.followuser = true;
  notifySettings.curatorinvite = true;
  notifySettings.remixproject = true;
  localStorage.setItem("notifySettings", JSON.stringify(notifySettings));
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.settings === "update") {
      notifySettings = JSON.parse(localStorage.getItem("notifySettings"));
      sendResponse({
        updated: "true"
      });
    }
  });

function getData() {
  // Get API token, username and CSRF token
  var tokenrequest = new XMLHttpRequest();
  tokenrequest.open("GET", "https://scratch.mit.edu/session/", true);
  tokenrequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  tokenrequest.send();
  tokenrequest.onreadystatechange = function() {
    if (tokenrequest.readyState === 4) {
      if (tokenrequest.status === 200) {
        var response = JSON.parse(tokenrequest.responseText);
        if (response.user === undefined) { // If user is logged out
          loggedIn = false;
          chrome.browserAction.setBadgeText({
            text: ""
          });
          return;
        }
        username = response.user.username;
        token = response.user.token;
        if (firstRun) {
          getMessageCount();
          firstRun = false;
        }
      }
    }
  };
  chrome.cookies.get({
    "url": "https://scratch.mit.edu/messages",
    "name": "scratchcsrftoken"
  }, function(cookie) {
    if (cookie) csrftoken = cookie.value;
  });
}

function getMessageCount() {
  if (!loggedIn) return;
  var getMsgCount = new XMLHttpRequest();
  getMsgCount.open("GET", "https://api.scratch.mit.edu/users/" + username + "/messages/count?avoidcache=" + Math.random(), true);
  getMsgCount.send();
  getMsgCount.onreadystatechange = function() {
    if (getMsgCount.readyState === 4) {
      if (getMsgCount.status === 200) {
        var prevMsgNum = msgNum;
        msgNum = JSON.parse(getMsgCount.responseText).count;
        var msgNumString = String(msgNum);
        if (msgNum === 0) chrome.browserAction.setBadgeText({
          text: ""
        });
        else chrome.browserAction.setBadgeText({
          text: msgNumString
        });
        if (prevMsgNum < msgNum) checkMessages();
      }
    }
  };
}

function checkMessages() {
  var messagesCheck = new XMLHttpRequest();
  messagesCheck.open("GET", "https://api.scratch.mit.edu/users/" + username + "/messages?limit=20&offset=0&avoidcache=" + Math.random(), true);
  messagesCheck.setRequestHeader("X-Token", token);
  messagesCheck.send();
  messagesCheck.onreadystatechange = function() {
    if (messagesCheck.readyState === 4) {
      if (messagesCheck.status === 200) {
        messagesArray = JSON.parse(messagesCheck.responseText);
        var currentDate = new Date();
        for (i = 0; i < messagesArray.length; i++) {
          var msg = messagesArray[i];
          var msgDate = new Date(msg.datetime_created);
          if ((currentDate.getTime() - msgDate.getTime()) > 20000) break; // If message is more than 20 seconds old, break loop, next messages will be older
          if (alreadySeen.includes(msg.id)) continue; // If message was already notified, dismiss
          newMessage(msg);
        }
      }
    }
  };
}

function newMessage(msg) {
  alreadySeen.push(msg.id); // Make sure this msg isn't notified again
  var actor = msg.actor_username;

  switch (msg.type) {
    case "addcomment":
      if (!notifySettings.addcomment) return;
      if (msg.comment_type === 0) { // Comment on own project or reply on someone else's
        var text = "💬 " + actor + " commented on project \"" + htmlCodesToString(msg.comment_obj_title) + "\":\n" + htmlCodesToString(msg.comment_fragment);
        var link = "https://scratch.mit.edu/projects/" + msg.comment_obj_id + "/#comments-" + msg.comment_id;
      }
      if (msg.comment_type === 1) { // Comment on own profile or reply on another profile
        if (msg.comment_obj_title === username) {
          var text = "💬 " + actor + " commented on your profile:\n" + htmlCodesToString(msg.comment_fragment);
          var link = "https://scratch.mit.edu/users/" + msg.comment_obj_title + "/#comments-" + msg.comment_id;
        } else {
          var text = "💬 " + actor + " replied on " + htmlCodesToString(msg.comment_obj_title) + "'s profile:\n" + htmlCodesToString(msg.comment_fragment);
          var link = "https://scratch.mit.edu/users/" + msg.comment_obj_title + "/#comments-" + msg.comment_id;
        }
      }
      if (msg.comment_type === 2) { // Studio reply
        var text = "💬 " + actor + " replied on studio \"" + htmlCodesToString(msg.comment_obj_title) + "\":\n" + htmlCodesToString(msg.comment_fragment);
        var link = "https://scratch.mit.edu/studios/" + msg.comment_obj_id + "/comments/#comments-" + msg.comment_id;
      }
      break;
    case "forumpost":
      if (!notifySettings.forumpost) return;
      var text = "📚 There are new posts in the forum thread \"" + htmlCodesToString(msg.topic_title) + "\"";
      var link = "https://scratch.mit.edu/discuss/topic/" + msg.topic_id + "/unread/";
      break;
    case "loveproject":
      if (!notifySettings.loveproject) return;
      var text = "❤️ " + actor + " loved your project \"" + htmlCodesToString(msg.title) + "\"";
      var link = "https://scratch.mit.edu/users/" + actor;
      break;
    case "favoriteproject":
      if (!notifySettings.favoriteproject) return;
      var text = "⭐ " + actor + " favorited your project \"" + htmlCodesToString(msg.project_title) + "\"";
      var link = "https://scratch.mit.edu/users/" + actor;
      break;
    case "followuser":
      if (!notifySettings.followuser) return;
      var text = "👤 " + actor + " is now following you";
      var link = "https://scratch.mit.edu/users/" + actor;
      break;
    case "curatorinvite":
      if (!notifySettings.curatorinvite) return;
      var text = "✉️ " + actor + " invited you to curate the studio \"" + htmlCodesToString(msg.title) + "\"";
      var link = "https://scratch.mit.edu/studios/" + msg.gallery_id + "/curators/"
      break;
    case "remixproject":
      if (!notifySettings.remixproject) return;
      var text = "🔄 " + actor + " remixed your project \"" + htmlCodesToString(msg.parent_title) + "\" as " + htmlCodesToString(msg.title);
      var link = "https://scratch.mit.edu/projects/" + msg.project_id;
      break;
    case "studioactivity":
      return; // Don't send studio activity
      break;
    default:
      notify("Unknown message content", "https://scratch.mit.edu/messages/")
  }

  notify(text, link);
}

function notify(text, link) {
  notifID++;
  notifOnClick[notifID] = link;
  chrome.notifications.create(String(notifID), {
    type: "basic",
    title: "New Scratch message",
    iconUrl: "/icon.png",
    message: text,
    buttons: [{
      title: "Open messages page"
    }, {
      title: "Mark all as read"
    }],
    requireInteraction: true
  });
}

function markAsRead() {
  var markMsgAsRead = new XMLHttpRequest();
  markMsgAsRead.open("POST", "https://scratch.mit.edu/site-api/messages/messages-clear/?scratchnotifierextension=1", true);
  markMsgAsRead.setRequestHeader("X-csrftoken", csrftoken);
  markMsgAsRead.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  markMsgAsRead.send();
  markMsgAsRead.onreadystatechange = function() {
    if (markMsgAsRead.readyState === 4) {
      if (markMsgAsRead.status === 200) {
        getMessageCount();
      }
    }
  };
}

function htmlCodesToString(input) {
  if (input === undefined) return undefined;
  return input.replace(/&#(\d+);/g, function(match, number) {
    return String.fromCharCode(number);
  })
}

function htmlCodesToString(input) {
  var txt = document.createElement("textarea");
  txt.innerHTML = input;
  return txt.value;
}

function openMessages() {
  chrome.tabs.query({
    url: "https://scratch.mit.edu/messages*"
  }, function(tabs) {
    if (tabs[0]) {
      chrome.windows.update(tabs[0].windowId, {
        focused: true
      });
      chrome.tabs.update(tabs[0].id, {
        "active": true
      });
      chrome.tabs.update(tabs[0].id, {
        "url": "https://scratch.mit.edu/messages/"
      });
    } else chrome.tabs.create({
      url: "https://scratch.mit.edu/messages/"
    })
  });
}

chrome.notifications.onClicked.addListener(function(notificationID) {
  markAsRead();
  chrome.notifications.clear(notificationID);
  var urlToOpen = notifOnClick[notificationID];
  chrome.tabs.create({
    url: urlToOpen
  });
});

chrome.notifications.onButtonClicked.addListener(function(notifID, buttonPressed) {
  chrome.notifications.clear(notifID);
  if (buttonPressed === 0) openMessages();
  if (buttonPressed === 1) markAsRead();
});

var extraInfoSpec = ['blocking', 'requestHeaders'];
if (chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty('EXTRA_HEADERS')) extraInfoSpec.push('extraHeaders');

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  details.requestHeaders.push({
    name: "Referer",
    value: "https://scratch.mit.edu/messages/"
  });
  return {
    requestHeaders: details.requestHeaders
  };
}, {
  urls: ["https://scratch.mit.edu/site-api/messages/messages-clear/?scratchnotifierextension=1"]
}, extraInfoSpec);

chrome.browserAction.onClicked.addListener(function(tab) {
  openMessages();
});
