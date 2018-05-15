"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);throw new Error("Cannot find module '" + o + "'");
      }var f = n[o] = { exports: {} };t[o][0].call(f.exports, function (e) {
        var n = t[o][1][e];return s(n ? n : e);
      }, f, f.exports, e, t, n, r);
    }return n[o].exports;
  }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
    s(r[o]);
  }return s;
})({ 1: [function (require, module, exports) {
    /*
    Github module for https://github.com/eisnerd/feedback-tool
    
    You need a personal token that will be used both as a reporter user and to upload screenshot
    images. Steps:
    
      - Create a specific github user.
      - Create a project (i.e.) snapshots to store images.
      - Create a personal token:
        - User -> Settings -> Developer Settings -> Personal access tokens -> Generate new token
        - Description: Upload screenshots for feedback.js
        - Select scopes: repo -> public_repo.
        - Generate token.
    
    This token should be kept secret, outside of any public repository. If that's too much of a
    hassle, it should be encoded somehow in the source. That's not secure (anyone could take
    it and upload files to our snapshot repo), but at least you won't get it automatically
    revoked by github.
    
    Usage:
    
      $.feedbackGithub({
        token: "PERSONAL_TOKEN",
        createIssue: true,
        postFunction: ({title, body}) => { },
        issues: {
          repository: "ORG/PROJECT_WHERE_ISSUES_WILL_BE_CREATED",
          renderTitle: title => `[User feedback] ${title}`,
          renderBody: body => ["## Some report", "", body].join("\n"),
        },
        snapshots: {
          repository: "ORG2/PROJECT_WHERE_SNAPSHOTS_WILL_BE_UPLOADED_TO",
          branch: "master",
        },
        feedbackOptions: {},
      });
    */

    var FeedBackToolGithub = function () {
      function FeedBackToolGithub(options) {
        _classCallCheck(this, FeedBackToolGithub);

        this.options = options;
      }

      _createClass(FeedBackToolGithub, [{
        key: "init",
        value: function init() {
          $.feedback(Object.assign({}, {
            postFunction: this._sendReport.bind(this)
          }, this.options.feedbackOptions || {}));
        }
      }, {
        key: "_setAuthHeader",
        value: function _setAuthHeader(xhr) {
          xhr.setRequestHeader("Authorization", "token " + this.options.token);
        }
      }, {
        key: "_sendReport",
        value: function _sendReport(data) {
          var _this = this;

          // data.post.img = "data:image/png;base64,iVBORw0KG..."
          var imgBase64 = data.post.img.split(",")[1];
          var uid = new Date().getTime() + parseInt(Math.random() * 1e6).toString();
          var postFunction = this.options.postFunction || function () {};

          return this._uploadFile("screenshot-" + uid + ".png", imgBase64).then(function (url) {
            return _this._getPayload(data, url);
          }).then(function (payload) {
            if (_this.options.createIssue) {
              _this._postIssue(payload).then(postFunction);
            } else {
              postFunction(payload);
            }
          }).then(data.success, data.error);
        }
      }, {
        key: "_uploadFile",
        value: function _uploadFile(filename, contents) {
          var payload = {
            "message": "feedback.js snapshot",
            "branch": this.options.snapshots.branch,
            "content": contents
          };

          return $.ajax({
            url: 'https://api.github.com/repos/' + this.options.snapshots.repository + '/contents/' + filename,
            type: "PUT",
            beforeSend: this._setAuthHeader.bind(this),
            dataType: 'json',
            data: JSON.stringify(payload)
          }).then(function (res) {
            return res.content.download_url;
          });
        }
      }, {
        key: "_getPayload",
        value: function _getPayload(data, screenshotUrl) {
          var info = data.post;
          var browser = info.browser;
          var body = ["## Browser", "- Name: " + browser.appCodeName, "- Version: " + browser.appVersion, "- Platform: " + browser.platform, "", "## User report", "URL: " + info.url, "", info.note, "", "![See screenshot here]( " + screenshotUrl + " )"].join("\n");

          return {
            "title": this.options.issues.renderTitle(info.title),
            "body": this.options.issues.renderBody ? this.options.issues.renderBody(body) : body
          };
        }
      }, {
        key: "_postIssue",
        value: function _postIssue(payload) {
          return $.ajax({
            type: "POST",
            url: 'https://api.github.com/repos/' + this.options.issues.repository + '/issues',
            beforeSend: this._setAuthHeader.bind(this),
            dataType: 'json',
            data: JSON.stringify(payload)
          }).then(function (res) {
            return Object.assign(payload, { issueURL: res.html_url });
          });
        }
      }]);

      return FeedBackToolGithub;
    }();

    $.feedbackGithub = function (options) {
      var feedBackToolGithub = new FeedBackToolGithub(options);
      feedBackToolGithub.init();
      return feedBackToolGithub;
    };
  }, {}] }, {}, [1]);