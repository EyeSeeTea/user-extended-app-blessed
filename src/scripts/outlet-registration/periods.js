var moment = require('moment');

/**
 * Helper module to create periods of time according to the different supported periods from dhis:
 *  'daily','weekly','monthly','yearly'
 */
function Periods(){
    this.config = {
        daily:{
            format:'YYYY-MM-DD',
            periodKey:'day'    
        },
        weekly:{
            format:'YYYY[W]WW',
            periodKey:'week'    
        },
        monthly:{
            format:'YYYYMM',
            periodKey:'month'    
        },
        yearly:{
            format:'YYYY',
            periodKey:'year'    
        }                        
    }
}

/**
 * Builds an array of 'num' strings, where every item corresponds to the period of time formatted according to the given type.
 * @param type Type of periods to returns 'daily','weekly','monthly','yearly'
 * @param num Num of periods to build from now into the past
 */
Periods.prototype.buildPeriods = function(type,num){
    var periods = [];
    var periodConfig = this.config[type] || this.config[type.toLowerCase()];
    
    if (!periodConfig) {
        var now = moment();
        for (var i = 0; i < num; i++) {
            //Format moment according to type and add moment to array
            periods.push(now.format(periodConfig.format));
            //Move backwards
            now = now.add(-1, periodConfig.periodKey);
        }
    }
    return periods;
}


/**
 * Returns a formatted string representing today - [num]
 * Ex: "2016-10-01"
 *  @param num Number of days to move
 */
Periods.prototype.moveAndFormatDay = function(num) {
    return moment().add(num, 'day').format(this.config.daily.format); 
}

module.exports = new Periods();