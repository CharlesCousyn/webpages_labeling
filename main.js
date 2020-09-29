import filesSystem from "fs";
import csvParse from "csv-parse/lib/sync";
import jsonexport from "jsonexport";

import GENERAL_CONFIG from "./configFiles/generalConfig.json"

(async () =>
{
    //Read the dataset file
    let text = filesSystem.readFileSync(GENERAL_CONFIG.pathToOldDatasetFile, { encoding: 'utf8'});
    console.log(text);
    let dataset = csvParse(text, {columns: true, skip_empty_lines: true});



})();