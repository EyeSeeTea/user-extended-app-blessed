var request = require('request');
var periods = require('./periods.js');

var fs = require('fs')
fs.readFile('config.json', 'utf8', function(err, conf) {
    if (err) {
        return console.log(err);
    }
    var autoindicatorsLoader = new AutoIndicatorsLoader(JSON.parse(conf));
    autoindicatorsLoader.loadAutoIndicators();
});


/**
 * Class in charge of loading autoindicators turning them into datavalues.
 */
function AutoIndicatorsLoader(conf) {
    //used endpoints
    this.endpoints = {
        INDICATORGROUPS: "/indicatorGroups.json?filter=name:eq:AutoIndicators&fields=indicators[*]",
        ATTRIBUTE_BY_NAME: "/attributes?fields=id&filter=name:eq:",
        DATASETS: "/dataSets/UID.json?fields=periodType",
        ANALYTICS: "/analytics.json?displayProperty=NAME&skipMeta=true&",
        DATAVALUESETS: "/dataValueSets"
    }; 
    //rest config
    this.conf = conf
    //common auth, endpoint config
    this.requestOptions = {
        headers: {
            authorization: 'Basic ' + this.conf.auth,
        },
        url: this.conf.protocol + "://" + this.conf.url + ((this.conf.apiVersion == "")?"":"/" +this.conf.apiVersion)
    }
    console.log("\nConfig:\n", JSON.stringify(this.conf, null, "\t"));
};

/**
 * Returns an object with url and auth info for the given endpoint
 * @param endpoint The endpoint with the params included
 */
AutoIndicatorsLoader.prototype.prepareOptions = function(endpoint) {
    var options = Object.assign({}, this.requestOptions);
    options.url += endpoint;
    return options;
}

/**
 * Loads each indicator from indicatorsGroup = 'AutoIndicator'
 */
AutoIndicatorsLoader.prototype.loadAutoIndicators = function() {
    console.log("\nLoading autoindicators...");
    var _this = this;
    //Ask for 'AutoIndicators'
    var url = this.prepareOptions(this.endpoints.INDICATORGROUPS);
    request(url, function(error, response, body) {
        _this.indicators = JSON.parse(body).indicatorGroups[0].indicators;
        console.log("Found " +
            _this.indicators.length +
            " indicators \n\t" +
            _this.indicators.map(function(indicator) { return indicator.displayName }).join("\n\t"));

        //Process every indicator
        _this.indicators.forEach(function(indicator) {
            _this.loadIndicator(indicator);
        });
    });
};

/**
 * Loads info for the given indicator
 * @param indicator The indicator whose aggregated values will be converted
 */
AutoIndicatorsLoader.prototype.loadIndicator = function(indicator) {    
    var _this=this;
    //Turns attribute.value -> .orgunit to ease process
    this.turnAttributeValuesIntoProperties(indicator);

    //Get dataset properties to calculate periods
    var url = this.prepareOptions(this.endpoints.DATASETS.replace("UID", indicator.dataSet));
    request(url, function(error, response, body) {
        indicator.periodType = JSON.parse(body).periodType;
        if (indicator.orgUnitGroup != undefined) {
            var orgUnitGroups = indicator.orgUnitGroup.split(";");
            orgUnitGroups.forEach(function (orgUnitGroup) {
                indicator.orgUnitGroup = orgUnitGroup;
                _this.prepareAndPostIndicator(indicator);
            });
        } else {
            _this.prepareAndPostIndicator(indicator);
        }
    });    

};

/**
 * Prepare and post the indicator with the correct params
 * @param indicator The indicator that will be enriched with additional readable properties.
 */
AutoIndicatorsLoader.prototype.prepareAndPostIndicator = function (indicator) {
    //Additional container where analytics params will be added
    indicator.queryParams = [];
    //prepare indicator
    this.prepareParamIndicator(indicator);
    //prepare orgunits
    this.prepareParamOrgUnits(indicator);
    //prepare periods
    this.prepareParamPeriod(indicator);
    //read data + post
    this.readAndPost(indicator);
}

/**
 * Turns codified attribute values into readable properties in the indicator (orgunit, dataset, ...)
 * @param indicator The indicator that will be enriched with additional readable properties.
 */
AutoIndicatorsLoader.prototype.turnAttributeValuesIntoProperties = function(indicator) {
    var attributeNames = Object.keys(this.conf.attributes);
    for (var i = 0; i < attributeNames.length; i++) {
        //Get attribute name
        var attributeName = attributeNames[i];
        //Get attribute id
        var attributeId = this.conf.attributes[attributeName];
        //Find attribute value in indicator
        var attributeValue = this.findAttributeValue(indicator, attributeId);
        //Add straight property to indicator
        indicator[attributeName] = attributeValue;
    }
}

/**
 * Returns the value of the given attributeId in the given indicator
 * @param indicator The indicator to search inside
 * @param attributeId The id of the attribute to be mapped
 */
AutoIndicatorsLoader.prototype.findAttributeValue = function(indicator, attributeId) {
    var foundAttribute = indicator.attributeValues.find(attribute => {
        return attribute.attribute.id === attributeId;
    })

    if (!foundAttribute) {
        return null;
    }
    return foundAttribute.value;
};

/**
 * Adds a query param to get data for the given indicator.
 * Example: filter=dx:rputP9u2eCx
 * @param indicator The indicator 
 */
AutoIndicatorsLoader.prototype.prepareParamIndicator = function(indicator) { 
    indicator.queryParams.push("dimension=dx:"+indicator.id);
};

/**
 * Adds a query param to get data for a period of time.
 * Example: dimension=pe:LAST_12_MONTHS 
 * @param indicator The indicator 
 */
AutoIndicatorsLoader.prototype.prepareParamPeriod = function(indicator) {
    //TODO according to property "dataset" (monthly, yearly, ..) 
    var dataPeriods = periods.buildPeriods(indicator.periodType,indicator.periods)
    dataPeriods = dataPeriods.join(";");   
    indicator.queryParams.push("dimension=pe:"+dataPeriods);
};

/**
 * Adds a query param to get data for a set of orgunits.
 * Example: dimension=ou:LEVEL-2;RZjIN6Adcdr 
 * @param indicator The indicator 
 */
AutoIndicatorsLoader.prototype.prepareParamOrgUnits = function(indicator) {
    var orgunitParam ="";
    //according to property "orgUnit+level" || orgUnitGroup (monthly, yearly, ..)
    if(indicator.orgUnit && indicator.level){
        orgunitParam="dimension=ou:LEVEL-"+indicator.level+";"+indicator.orgUnit;    
    }
    //review where to get root orgunit
    if(indicator.orgUnitGroup){
        orgunitParam="dimension=ou:OU_GROUP-"+indicator.orgUnitGroup;    
    }
    
    indicator.queryParams.push(orgunitParam);
};

/**
 * Retrieves data from analytics for the given indicator
 * @param indicator The indicator 
 */
AutoIndicatorsLoader.prototype.readAndPost = function(indicator) {
    var _this = this;
    var addedParams = this.endpoints.ANALYTICS + indicator.queryParams.join("&");
    var url = this.prepareOptions(addedParams);    
    request(url, function(error, response, body) {
        console.log("\nLoading indicator " + indicator.displayName);
        var rows = JSON.parse(body).rows;
        console.log(JSON.stringify(rows, null, "\t"));
        if (rows != undefined) {
            var dataValues = _this.buildDataValues(indicator, rows);
            _this.postDataValues(dataValues);
        }
    });    
};

/**
 * Retrieves data from analytics for the given indicator
 * @param indicator The indicator 
 * @param rows The values retrieved from analytics
 */
AutoIndicatorsLoader.prototype.buildDataValues = function(indicator, rows) {
    var dataValues = rows.map( value =>{
        return {
            "dataElement":indicator.code,
            "indicator": value[0],
            "orgUnit": value[1],            
            "period": value[2],
            "value": value[3]
        }
    });
    
    return {"dataValues":dataValues};
}

/**
 * Post datavalues to server
 * @param dataValues The dataValues that will be posted
 */
AutoIndicatorsLoader.prototype.postDataValues = function(dataValues) {
    
    var _this = this;
    var postInfo = this.prepareOptions(this.endpoints.DATAVALUESETS);        
    postInfo.json=true; 
    postInfo.body =  dataValues;       
    request.post(postInfo, function(error, response, body) {
        if(error){
            console.error("Error posting values: ",error);
            return;
        }
        console.log("Values posted OK, summary",JSON.stringify(body.importCount,null,"\t"));
    });
}



