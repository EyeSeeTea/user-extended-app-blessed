#!/usr/bin/env node

const util = require("util");
const _ = require("underscore");
const bluebird = require("bluebird");
const moment = require("moment");
const request = require("request-promise");
const basicAuth = require("basic-authorization-header");
const nconf = require("nconf");

const debug = (msg, ...args) => console.error(util.format("[DEBUG] " + msg, ...args));
const toArray = (obj) => Array.isArray(obj) ? obj : [obj];
const concurrent = (promises, mapper, concurrency = 5) =>
  bluebird.map(promises, mapper, {concurrency: concurrency});

class UserProgramAttributeAssignment {
    constructor(options) {
        this.options = options;
        this.api_url = this.options.api.url;
        this.programs = toArray(options.programs);
        this.fromDate = moment().add(options.fromDate, "day").format("YYYY-MM-DD");
        this.headers = {
            "authorization": basicAuth(options.api.auth.username, options.api.auth.password),
            "accept": "application/json",
            "content-type": "application/json",
        };
    }

    static fromArgsAndConfigFile(configPath) {
        const config = nconf.argv().file({file: configPath});
        const fixer = new UserProgramAttributeAssignment(config.get());
        return fixer.run();
    }

    request(uriPath, options = {}) {
        const url = this.api_url + "/" + uriPath;
        const defaultOptions = {url: url, headers: this.headers, method: "GET"};
        const fullOptions = _.defaults(options, defaultOptions);
        
        return request(fullOptions)
            .catch(err => { throw util.format("%s %s: %s", fullOptions.method, url, err); })
            .then(JSON.parse);
    }

    getUserIds() {
        debug("= Get categoryOptions to build dictionary {userCode: userId}");
        let qs = {filter: "code:!null", fields: "id, code", paging: false};
        return this
            .request("categoryOptions", {qs: qs})
            .then(res => _.chain(res.categoryOptions).map(co => [co.code, co.id]).object().value());
    }

    getProgramEvents(programId, startDate) {
        debug("= Get events from program %s from date %s", programId, startDate);
        const qs = {program: programId, startDate: startDate, skipPaging: true};
        return this.request("events", {qs: qs, method: "GET"}).then(res => res.events);
    }

    updateUserEvent(userIds, event) {
        const username = event.dataValues && event.dataValues.length > 0 ? 
          event.dataValues[0].storedBy : null;
        const categoryOptions = event.attributeCategoryOptions;
        const userId = userIds[username];
        const eventId = event.event;

        if (!username) {
            debug("Event %s: No storedBy info found in dataValues", eventId);
        } else if (!userId) {
            debug("Event %s: user <%s> not found in category options", eventId, username);
        } else if (categoryOptions == userId) {
            debug("Event %s: user <%s> already set in category options", eventId);
        } else {
            const newEvent = _.defaults({attributeCategoryOptions: userId}, event);
            const body = JSON.stringify(newEvent);
            debug("Event %s: REPLACED <%s> by <%s> (%s)", eventId, categoryOptions, userId, username);
            return this.request("events/" + eventId, {method: "PUT", body: body});
        }
    }

    run() {
        return this.getUserIds().then(userIds =>
            bluebird.each(this.programs, programId =>
                this.getProgramEvents(programId, this.fromDate).then(events =>
                    concurrent(events, event => this.updateUserEvent(userIds, event)))));
    }
}

if (require.main === module) {
    UserProgramAttributeAssignment.fromArgsAndConfigFile("config.json");
}
