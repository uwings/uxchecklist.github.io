/*
  author: Alessio Franceschelli - @AleFranz - alessio@franceschelli.me
  
  This code is released under the terms of the MIT license (http://opensource.org/licenses/MIT)
*/

/* global gapi */
"use strict";

var logHelper = (document.location.hostname == "localhost" && Function.prototype.bind) ?
  Function.prototype.bind.call(console.log, console) :
  function() {};

var Realtime = Realtime || {};

Realtime.Controller = function(view) {
  this.view = view;
  this.uxchecklist = null;
  this.fileId = null;
};

Realtime.Controller.prototype.log = logHelper;

Realtime.Controller.prototype.isLoaded = function() {
  return this.uxchecklist != null;
};

Realtime.Controller.prototype.loaded = function(result) {
  console.log('Realtime.loaded invoke', result);
  
  var model = result.properties;
  this.uxchecklist = model || [];
  
  console.log('Realtime.loaded model', this.uxchecklist, model);

  var self = this;

  var syncData = {};
  this.uxchecklist.map(function (x) {
    syncData[x.key] = (x.value === 'true') ? true : false;
  });

  var resetData = {};
  Object.keys(this.view.checkboxes).map(function (x) {
    resetData[ self.view.checkboxes[x].id ] = false;
  });

  var mergedData = Object.assign({}, resetData, syncData);

  console.log('Merge data mapped:', mergedData);
  console.log('Sync data mapped:', syncData);

  Object.keys(mergedData).map(function (x) {
    self.view.checkboxes[x].setChecked(mergedData[x]);
  });

  $('#overlay').fadeOut();
};

Realtime.Controller.prototype.onCheckBoxChange = function(key) {
  var self = this;
  var value = this.view.checkboxes[key].isChecked();
  this.uxchecklist[key] = value;
  gapi.client.drive.properties.insert({fileId: this.fileId, resource: {
    key: key,
    value: value
  }}).then(
    function(r) {
      self.log("saved " + key + " as " + value);
    }
  );
};

Realtime.Controller.prototype.start = function(title, ids, defaultTitle) {
  $('#overlay').fadeIn();
  var self = this;
  if (ids) {
    self.fileId = ids;
    self.open(ids, title);
  } else {
    this.listFiles(function (files){
      title = title || (files.length > 0 ? files[0].title : defaultTitle);
      self.log(title);
      self.openFile(title, function (file) {
        self.fileId = file.id;
        self.open(file.id, title);
      });
    });
  }
};

Realtime.Controller.prototype.open = function(id, title) {
  var self = this;
  self.fileId = id;
  gapi.client.drive.files.get({fileId: id}).then(
    function(r) {
        self.log(r);
        self.listFiles(function(files){
          self.log(self.view.fileList);
          self.view.fileList.set(
            files.map(function(file) {return file.title;}),
            files.filter(function(file){return file.id == id;})[0].title,
            id
          );
          var found = false;

          for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file.id === r.result.id) {
              found = true;

              if (file.version >= r.result.version) {
                self.loaded(file);
                return;
              }
            }
          }

          if (!found) {
            self.loaded(r.result);
          }
        });
    });
    // function(model) { self.initializeModel(model, false); });

    history.pushState({}, title, '?title=' + title);
};

Realtime.Controller.prototype.initializeModel = function(model) {
  var uxchecklist = model.create(Realtime.Model.UxCheckList);
  model.getRoot().set('uxchecklist', uxchecklist);
  uxchecklist.version = 1;
  uxchecklist.checkboxes = model.createMap();
  this.log(uxchecklist.version);
  this.save(uxchecklist);
};

Realtime.Controller.prototype.save = function(uxchecklist) {
  var self = this;
  var batch = gapi.client.newBatch();
  var buildRequest = function(key, value) {
    return gapi.client.drive.properties.insert({fileId: self.fileId, resource: {
      key: key,
      value: value
    }});
  };
  uxchecklist = uxchecklist || this.uxchecklist;
  for(var key in this.view.checkboxes) {
    var cb = this.view.checkboxes[key];
    var value = cb.isChecked();
    self.log("saving " + key + " as " + value);
    batch.add(buildRequest(key, value));
  }
  batch.then(function(r){self.log(r);});
};

Realtime.Controller.prototype.rename = function(newTitle, success) {
  var body = {'title': newTitle};
  var request = gapi.client.drive.files.patch({
    fileId: this.fileId,
    resource: body
  });
  request.execute(function(resp) {
    log('New Title: ' + resp.title);
    success(resp.title);
  });
}

Realtime.Controller.prototype.init = function() {
  // gapi.drive.realtime.custom.registerType(Realtime.Model.UxCheckList, 'UxCheckList');
  // Realtime.Model.UxCheckList.prototype.version = gapi.drive.realtime.custom.collaborativeField('version');
  // Realtime.Model.UxCheckList.prototype.checkboxes = gapi.drive.realtime.custom.collaborativeField('checkboxes');
};

Realtime.Controller.prototype.auth = function(immediate, success, fail, title, ids, defaultTitle) {
  var self = this;
  gapi.auth.authorize({
    'client_id': '939842792990-97uqc8rc3h645k65ecd4j7p3u0al17aj.apps.googleusercontent.com',
    'scope': 'https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata email profile',
    'immediate': immediate, 
    'cookie_policy': 'single_host_origin'
  }, function(r) { console.log(r); self.checkAuth(r, success, fail, title, ids, defaultTitle); });
};

Realtime.Controller.prototype.checkAuth = function(authResult, success, fail, title, ids, defaultTitle) {
  if (authResult && !authResult.error) {
    this.log(authResult);
    success();
    this.start(title, ids, defaultTitle);
  } else {
    fail();
  }
};

Realtime.Controller.prototype.openFile = function(title, callback) {
  var self = this;
  self.log(title);
  gapi.client.load('drive', 'v2', function () {
    var mimeType = 'application/vnd.google-apps.drive-sdk';
    gapi.client.drive.files.list({'q': "title = '" + title + "' and trashed = false" })
      .execute(function(r){
        self.log(r);
        if (!r || r.items.length < 1) {
          self.log("create");
          gapi.client.drive.files.insert({
            resource: {
              mimeType: mimeType,
              title: title
            }
          }).execute(callback);
        } else {
          var file = r.items[0];
          self.log(file);
          callback(file);
        }
      });
  });
};

Realtime.Controller.prototype.deleteFile = function(id, callback) {
  var self = this;
  var id = id ? id : self.fileId;
  self.log("delete");
  gapi.client.drive.files.delete({
    fileId: self.fileId
  })
  // .execute(function(f){
  //     gapi.client.drive.files.list({'q': "title = '" + title + "' and trashed = false" })
  //       .execute(function(r){
  //         self.log(r);
  //       })
  // })
  .execute(callback);


  // gapi.client.load('drive', 'v2', function () {
  //   var mimeType = 'application/vnd.google-apps.drive-sdk';
  //   gapi.client.drive.files.list({'q': "title = '" + title + "' and trashed = false" })
  //     .execute(function(r){
  //       self.log(r);
  //       if (!r || r.items.length < 1) {
  //         self.log("delete");
  //         gapi.client.drive.files.delete({
  //           'fileId': self.fileId
  //         }).execute(callback);
  //       } else {
  //         var file = r.items[0];
  //         self.log(file);
  //         callback(file);
  //       }
  //     });
  // });
};

Realtime.Controller.prototype.listFiles = function(callback) {
  var self = this;
  gapi.client.load('drive', 'v2', function () {
    gapi.client.drive.files.list({'q': "trashed = false" })
      .execute(function(r){
        self.log(r);
        var files = r.items;
        self.log(files);
        callback(files);
      });
  });
};

Realtime.View = function(fileList, checkboxes) {
  this.log(fileList);
  this.fileList = fileList;
  this.checkboxes = checkboxes;
};

Realtime.View.prototype.log = logHelper;

Realtime.Model = Realtime.Model || {};

Realtime.Model.UxCheckList = function () {};

Realtime.Model.CheckBox = function(id, element, isCheckedFn, setCheckedFn) {
  this.id = id;
  this.element = element;
  this.isCheckedFn = isCheckedFn;
  this.setCheckedFn = setCheckedFn;
};

Realtime.Model.CheckBox.prototype.isChecked = function() {
  return this.isCheckedFn(this.id, this.element);
};

Realtime.Model.CheckBox.prototype.setChecked = function(val) {
  this.setCheckedFn(this.id, this.element, val);
};

Realtime.Model.FileList = function(element, setTitles) {
  this.element = element;
  this.setTitles = setTitles;
  this.titles = [];
  this.selectedTitle = null;
  this.fileId = null;
};

Realtime.Model.FileList.prototype.log = logHelper;

Realtime.Model.FileList.prototype.set = function(titles, selectedTitle, fileId) {
  this.log(selectedTitle);
  this.titles = titles;
  this.selectedTitle = selectedTitle;
  this.fileId = fileId;
  this.setTitles(this.titles, this.selectedTitle, this.fileId, this.element);
};
