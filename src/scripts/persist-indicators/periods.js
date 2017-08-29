var moment = require('moment');

/**
 * Helper module to create periods of time according to the different supported periods from dhis:
 *  'daily','weekly','monthly','yearly'
 */
function Periods(){
    //XXX Using isoWeek considering the number of week depends on its Thursday
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
    //Error -> this should not happen
    if(!periodConfig){
        return periods;
    }
    //We start from the previous completed period (previous month, week, ..)
    var now = moment().add(-1, periodConfig.periodKey);
    for (var i = 0; i < num; i++) {
        //Format moment according to type
        var formattedNow = now.format(periodConfig.format);
        //Add moment to array
        periods.push(formattedNow);
        //Move backwards
        now = now.add(-1, periodConfig.periodKey);
    }
    return periods;
}

module.exports = new Periods();