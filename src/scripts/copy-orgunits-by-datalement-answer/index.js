#!/usr/bin/env node

const _ = require("lodash");
const bluebird = require("bluebird");
const querystringify = require("querystringify").stringify;
const moment = require("moment");
const request = require("request-promise");
const basicAuth = require("basic-authorization-header");
const nconf = require("nconf");

const debug = console.error;

class CopyOrgUnitsByDataElementAnswer {
    constructor(options) {
        this.options = options;
        this.startDate = moment().add(options.startDate, "day").format("YYYY-MM-DD");
        this.apiUrl = this.options.api.url.replace(/\/*$/, "");
        this.headers = {
            "authorization": basicAuth(options.api.auth.username, options.api.auth.password),
            "accept": "application/json",
            "content-type": "application/json",
        };
    }

    static fromArgsAndConfigFile(configPath) {
        const config = nconf.argv().file({file: configPath});
        const instance = new this(config.get());
        return instance.run().catch(err => console.error("Error: " + err.toString()));
    }

    request(method, uriPath, options = {}) {
        const url = this.apiUrl + "/" + uriPath.replace(/^\/*/, "");
        const defaultOptions = {
            url: url,
            headers: this.headers,
            json: true,
            method: method || "GET",
        };
        const fullOptions = _.defaults(options, defaultOptions);
        const queryString = options.qs ? ("?" + querystringify(options.qs)) : "";
        debug(`${defaultOptions.method} ${url}${queryString}`);
        return request(fullOptions);
    }

    getOrgUnitsFromGroup(orgUnitId) {
        return this.request("GET", "/organisationUnitGroups/" + orgUnitId)
            .then(res => res.organisationUnits.map(ou => ou.id));
    }

    filterOrgUnitsByProgramEventsWithAnswer(orgUnitIds) {
        debug(`Org units to check: ${orgUnitIds.length}`);
        const dataValueHasAnswer = (dataValue) =>
            dataValue.dataElement === this.options.dataElementId &&
            dataValue.value == this.options.dataElementAnswer;

        return bluebird.filter(orgUnitIds, ouId => {
            const qs = {orgUnit: ouId, program: this.options.program, startDate: this.startDate};
            return this.request("GET", "/events", {qs})
                .then(({events}) => _(events).flatMap("dataValues").some(dataValueHasAnswer));
        }, {concurrency: 5});
    }

    addOrgUnitsToTarget(orgUnitIdToAssign) {
        debug("Org units to assign:", orgUnitIdToAssign.length);
        const targetId = this.options.orgUnitGroupTarget;
        return bluebird.map(orgUnitIdToAssign, ouId =>
            this.request("POST", `/organisationUnitGroups/${targetId}/organisationUnits/${ouId}`),
            {concurrency: 5});
    }

    getAllOrgUnits() {
        return Promise.all([
            this.getOrgUnitsFromGroup(this.options.orgUnitGroupOrigin),
            this.getOrgUnitsFromGroup(this.options.orgUnitGroupTarget),
        ]).then(([orgUnitsOriginIds, orgUnitsTargetIds]) => {
            return {origin: orgUnitsOriginIds, target: orgUnitsTargetIds};
        });
    }

    run() {
        return this.getAllOrgUnits()
            .then(orgUnits => _.difference(orgUnits.origin, orgUnits.target))
            .then(this.filterOrgUnitsByProgramEventsWithAnswer.bind(this))
            .then(this.addOrgUnitsToTarget.bind(this));
    }
}

if (require.main === module) {
    CopyOrgUnitsByDataElementAnswer.fromArgsAndConfigFile("config.json");
}
