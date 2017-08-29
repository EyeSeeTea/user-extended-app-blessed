var request = require('request');
var dateFormatter = require('./dateFormatter.js');
const basicAuth = require("basic-authorization-header");

var fs = require('fs')
fs.readFile('config.json', 'utf8', function (err, conf) {
    if (err) {
        return console.error("Invalid config.json ", err);
    }
    var organisationUnitActivator = new OrganisationUnitActivator(JSON.parse(conf));
    organisationUnitActivator.run();
});

/**
 * Main class
 */
function OrganisationUnitActivator(conf) {
    this.endpoints = {
        DATAELEMENTGROUP: "/dataElementGroups/UID?fields=dataElements[id,attributeValues]",
        ORGANISATION_UNITS_BY_UID: "/organisationUnits/UID?fields=level",
        ORGANISATION_UNITS_BY_ORGANISATION_UNIT_GROUP: "/organisationUnitGroups/UID?fields=organisationUnits[id,closedDate,openingDate]",
        ORGANISATION_UNITS_BY_PARENT_AND_LEVEL: "/organisationUnits/UID?level=LEVELVALUE&fields=id,closedDate,openingDate",
        DATAVALUE_SETS: "/dataValueSets" 
    };

    this.attributeUids = {
        LEVEL: conf.attributes.level,
        PARENT: conf.attributes.parent,
        ORGUNITGROUP: conf.attributes.orgUnitGroup,
        PERIOD: conf.attributes.period
    };

    this.dataElementGroup = conf.dataElementGroup;

    //common auth
    this.requestOptions = {
        headers: {
            "authorization": basicAuth(conf.api.auth.username, conf.api.auth.password),
            "accept": "application/json",
            "content-type": "application/json",
        },
        url: conf.api.protocol + "://" + conf.api.url
    }

    //counts asynchronous calls to the server
    this.asyncCalls = 0;
    this.dataValues = [];
    console.log("\nConfig:\n", JSON.stringify(conf, null, "\t"));
};

/**
 * Run script
 */
OrganisationUnitActivator.prototype.run = function () {
    console.log("\nLoading script..."); 
    //Process the dataElement group 
    this.processDataElementGroup(); 
};

/**
 * Prepare the options to make the server request.
 * @param endpoint The endpoint with the params included
 * @return an object with url and auth info for the given endpoint
 */
OrganisationUnitActivator.prototype.prepareOptions = function (endpoint) {
    var options = Object.assign({}, this.requestOptions);
    options.url += endpoint;
    return options;
}

/**
 * Prepare the data Elements and load the organisationUnits for each dataelement in a given data element group
 */
OrganisationUnitActivator.prototype.processDataElementGroup = function () {
    console.log("\nLoading dataElements...");
    var _this = this;
    var endpoint = this.endpoints.DATAELEMENTGROUP.replace("UID", this.dataElementGroup);
    var url = this.prepareOptions(endpoint);
    console.info("Request the dataelements from a dataelementgroup ", "URL: " + url.url);
    this.asyncCalls++;
    request(url, function (error, response, body) {
        if (error != undefined) {
            console.error("Server not found " + error);
            _this.asyncCalls--;
            return;
        }

        var dataElements = JSON.parse(body).dataElements; 
        console.info("Found " + dataElements.length + " dataElements \n\t" + dataElements.map(function (dataElement) { return dataElement.id }).join("\n\t"));

        //Process every dataElements
        dataElements.forEach(function (dataElement) { 
            console.info("\nConfig:\n", JSON.stringify(dataElement, null, "\t")); 
            _this.prepareDataElement(dataElement);
            if (_this.isDataElementValid(dataElement)) {
                _this.processDataElements(dataElement); 
            }
        });
        _this.asyncCalls--;
    });
};

/**
 * Check if the prepared dataelement is valid
 * @param dataElement The active dataElement 
 * @return if the dataElement is valid or invalid
 */
OrganisationUnitActivator.prototype.isDataElementValid = function (dataElement) {
    if ((dataElement.parent == undefined || dataElement.level == undefined) && dataElement.orgUnitGroup == undefined) {
        console.error("Invalid dataElement organisation unit attributes DataElement:" + dataElement.id);
        return false;
    }
    return true;
};

/**
 * Build  dataElement attributes
 * @param dataElement The active dataElement
 */
OrganisationUnitActivator.prototype.prepareDataElement = function (dataElement) {
    var _this = this; 
    console.log("\nPreparing dataElement:" + dataElement.id);
    dataElement.attributeValues.forEach(function (attributeValue) {
        if (attributeValue.attribute.id == _this.attributeUids.LEVEL) {
            dataElement.level = attributeValue.value;
        }
        else if (attributeValue.attribute.id == _this.attributeUids.PARENT) {
            dataElement.parent = attributeValue.value;
        }
        else if (attributeValue.attribute.id == _this.attributeUids.ORGUNITGROUP) {
            dataElement.orgUnitGroup = attributeValue.value;
        }
        else if (attributeValue.attribute.id == _this.attributeUids.PERIOD) {
            dataElement.periods = attributeValue.value;
        }
    });
};

/** 
 * Load the organisationUnit for each dataelement.
 * @param dataElement The active dataElement
 */
OrganisationUnitActivator.prototype.processDataElements = function (dataElement) {
    console.log("\nLoading organisationUnits...");
    if (dataElement.orgUnitGroup != undefined) {
        _this = this;
        console.info("\nLoading orgUnits from orgUnitGroup " + dataElement.orgUnitGroup);
        var orgUnitGroups = dataElement.orgUnitGroup.split(";");
        orgUnitGroups.forEach(function (organisationUnitGroup) {
            _this.processOrgUnitsByOrgUnitGroup(dataElement, organisationUnitGroup);
        });
    } else {
        console.info("\nLoading orgUnits from parent: " + dataElement.parent + " level: " + dataElement.level);
        this.processOrgUnitsFromParentLevel(dataElement);
    }
};

/** 
 * Load the organisationUnit parent using the parent attribute and loads the organisationUnit by level.
 * @param dataElement The active dataElement
 */
OrganisationUnitActivator.prototype.processOrgUnitsFromParentLevel = function (dataElement) {
    var _this = this;
    var endpoint = this.endpoints.ORGANISATION_UNITS_BY_UID.replace("UID", dataElement.parent);
    var url = this.prepareOptions(endpoint);
    console.info("Request the organisationUnit parent from parent attribute. URL: " + url.url);
    this.asyncCalls++;
    request(url, function (error, response, body) {
        if (error != undefined) {
            console.error("Error loading orgUnit from parent and level", error);
            _this.asyncCalls--;
            return;
        }
        dataElement.parentLevel = JSON.parse(body).level;
        _this.processOrgUnitsByLevel(dataElement);
        _this.asyncCalls--;
    });
};

/**
 * Load the organisationUnit by level.
 * @param dataElement The active dataElement
 */
OrganisationUnitActivator.prototype.processOrgUnitsByLevel = function (dataElement) {
    var _this = this;
    var endpoint = this.endpoints.ORGANISATION_UNITS_BY_PARENT_AND_LEVEL.replace("UID", dataElement.parent).replace("LEVELVALUE", dataElement.level - dataElement.parentLevel);
    var url = this.prepareOptions(endpoint);
    console.info("Request the organisationUnit  by level", "URL: " + url.url);
    this.asyncCalls++;
    request(url, function (error, response, body) {
        _this.processOrgUnitResponse(error, response, body, dataElement);
    });
};

/** 
 * Load the organisationUnit by orgUnit group
 * @param dataElement The active dataElement
 * @param orgUnitGroup The uid of the organisation unit group
 */
OrganisationUnitActivator.prototype.processOrgUnitsByOrgUnitGroup = function (dataElement, orgUnitGroup) {
    var _this = this;
    var endpoint = this.endpoints.ORGANISATION_UNITS_BY_ORGANISATION_UNIT_GROUP.replace("UID", orgUnitGroup);
    var url = this.prepareOptions(endpoint);
    console.info("Request the organisationUnit using the OrgUnitGroup attribute", "URL: " + url.url);
    this.asyncCalls++;
    request(url, function (error, response, body) {
        _this.processOrgUnitResponse(error, response, body, dataElement);
    });
};

/** 
 * Process organisationUntis responses
 * @param error 
 * @param response 
 * @param body  
 */
OrganisationUnitActivator.prototype.processOrgUnitResponse = function (error, response, body, dataElement) {
    if (error != undefined) {
        console.error("Error loading orgUnits",
            error);
        this.asyncCalls--;
        return;
    }

    console.info("Response body: ", body);
    var organisationUnits = JSON.parse(body).organisationUnits;
    if (organisationUnits == undefined) {
        console.error("Error: OrganisationUnits not Found.", "dataelement: " + dataelement.id);
        this.asyncCalls--;
        return;
    }
    
    console.info("Found " + organisationUnits.length + " dataElements \n\t" + organisationUnits.map(function (organisationUnit) { return organisationUnit.id }).join("\n\t"));

    this.prepareDataValues(organisationUnits, dataElement);
    this.asyncCalls--;
    this.pushDataValues();
}

/** 
 * Loop over the organisation units and prepare dataSets
 * @param organisationUnits
 * @param dataElement 
 */
OrganisationUnitActivator.prototype.prepareDataValues = function (organisationUnits, dataElement) { 
    console.log("\nPreparing dataValues");
    var _this = this;
    organisationUnits.forEach(function (organisationUnit) {
        _this.prepareDataOrgUnitDataValues(organisationUnit, dataElement);
    });
};

/**
 * Prepare the dataSet and add a dataValue
 * @param orgUnit Contains the organisation unit uid and the closed and opening dates used to set the orgUnit as active or inactive
 * @param dataElement The dataelement to be pushed with this organisation Unit 
*/
OrganisationUnitActivator.prototype.prepareDataOrgUnitDataValues = function (orgUnit, dataElement) {
    //Parse the server dates. 
    orgUnit.closedDate =  dateFormatter.parseDateFromDhis(orgUnit.closedDate);
    orgUnit.openingDate = dateFormatter.parseDateFromDhis(orgUnit.openingDate);

    var today = new Date();
    today.setMonth(((today.getMonth() + 1) - parseInt(dataElement.periods)));
    //Starting the fixDate variable in 1 skipes the current month
    for (var fixDate = 1; fixDate < parseInt(dataElement.periods)+1; fixDate++) { 
        var date = new Date(); 
        //Fix the date to show the actual period date month
        date.setMonth(((date.getMonth()) - fixDate));

        var row = { "dataElement": dataElement.id, "period": dateFormatter.parseDateToPeriodFormat(date), "orgUnit": orgUnit.id, "value": 0 };  

        if (orgUnit.closedDate == undefined
            || dateFormatter.areDatePeriodsEquals(orgUnit.closedDate, date)
            || date.getTime() < orgUnit.closedDate.getTime()) {
            //If closedDate does not exist the orgUnit is active
            row["value"] = 1;
        } 
        else if (
            (orgUnit.openingDate != undefined
                && orgUnit.openingDate.getTime() > orgUnit.closedDate.getTime())
            && orgUnit.openingDate.getTime() < date.getTime()) {
            row["value"] = 1;
            //if the closedDate is previous than the openingDate and the opening date is previous than the period date the orgunit is active
        }

        console.info("Added new Dataperiod. dataElement uid:" + row.dataElement + " period " + row.period + " - " + fixDate + " OrgUnit uid: " + row.orgUnit + " value " + row.value);

        //push the row into the dataValues array
        this.dataValues.push(row);
    }
}

/**
 * Push all the datavalues
 */
OrganisationUnitActivator.prototype.pushDataValues = function () {
    console.info("\nPending asyncalls: " + this.asyncCalls);
    if (this.asyncCalls == 0) {
        console.log("Pushing dataValues");
        this.push();
        console.log("The dataValues created from the dataElementGroup " + this.dataElementGroup + " was pushed");
    }
};

/**
 * Build the dataValues 
 * @return a valid Json datavalues
 */
OrganisationUnitActivator.prototype.buildDataValues = function () {
    var dataValues = this.dataValues.map(value => {
        return {
            "dataElement": value.dataElement,
            "orgUnit": value.orgUnit,
            "period": value.period,
            "value": value.value
        }
    });

    return { "dataValues": dataValues };
}

/**
 * Post datavalues to server 
 */
OrganisationUnitActivator.prototype.push = function () {
    var _this = this;
    var url = this.prepareOptions(this.endpoints.DATAVALUE_SETS);
    url.json = true;
    url.body = this.buildDataValues();
    console.info("Push of all the datavalues url", "URL: " + url.url); 
    request.post(url, function (error, response, body) {
        if (error != undefined) {
            console.error("Error pushing datavalues ",
                error);
            return;
        }

        console.log("Values posted OK, summary", JSON.stringify(body, null, "\t"));
        console.log("\nScript operations finished. You can close this window."); 
    });
}