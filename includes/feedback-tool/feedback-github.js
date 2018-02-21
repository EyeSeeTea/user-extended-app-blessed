class FeedBackToolGithub {
  constructor(options) {
    this.token = options.token;
    this.issues = options.issues;
    this.snapshots = options.snapshots;
    this.feedback = options.feedback;
  }
  
  init() {
    $.feedback(Object.assign({}, {
      postFunction: this._sendReport.bind(this),
    }, this.feedback));
  }
  
  _setAuthHeader(xhr) {
    xhr.setRequestHeader("Authorization", "token " + this.token);
  }
  
  _sendReport(data) {
    // data.post.img = "data:image/png;base64,iVBORw0KG..."
    const imgBase64 = data.post.img.split(",")[1];
    const uid = new Date().getTime() + parseInt(Math.random() * 1e6).toString();
     
    this._uploadFile("screenshot-" + uid + ".png", imgBase64)
      .then(url => this._postIssue(data, url))
      .then(data.success, data.error); 
  }

  _uploadFile(filename, contents) {
    const payload = {
      "message": "feedback.js snapshot",
      "branch": this.snapshots.branch,
      "content": contents,    
    };
    
    return $.ajax({
      url: 'https://api.github.com/repos/' + this.snapshots.repository + '/contents/' + filename,
      type: "PUT",
      beforeSend: this._setAuthHeader.bind(this),
      dataType: 'json',
      data: JSON.stringify(payload),
    }).then(res => res.content.download_url);
  }

  _postIssue(data, screenshotUrl) {
    const info = data.post;
    const browser = info.browser;
    const body = [
      "## Browser",
      "- Name: " + browser.appCodeName,
      "- Version: " + browser.appVersion,
      "- Platform: " + browser.platform,
      "## User report",
      "URL: " + info.url,
      "",
      info.note,
      "",
      "![screenshot](" + screenshotUrl + ")",
    ].join("\n")
    const payload = {
      "title": this.issues.title,
      "body": this.issues.renderBody ? this.issues.renderBody(body) : body, 
    };
    
    return $.ajax({
      type: "POST",
      url: 'https://api.github.com/repos/' + this.issues.repository + '/issues',
      beforeSend: this._setAuthHeader.bind(this),
      dataType: 'json',
      data: JSON.stringify(payload),
    });
  }
}

$.feedbackGithub = function(options) {
  const feedback = new FeedBackToolGithub(options);
  feedback.init();
  return feedback;
}