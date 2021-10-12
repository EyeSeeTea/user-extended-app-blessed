btoa = s => new Buffer(s).toString("base64");

Object.assign(exports, {
    baseUrl: "https://dev.eyeseetea.com/who-dev-234",
    authorization: "Basic " + btoa("fernandezl:Resistance2019!"),
});
