import filesSystem from "fs";
import csvParse from "csv-parse/lib/sync";
import jsonexport from "jsonexport";
import puppeteer from "puppeteer"

import GENERAL_CONFIG from "./configFiles/generalConfig.json";

async function saveDataset(dataset)
{
    console.log("Saving dataset...")
    const csv = await jsonexport(dataset, {rowDelimiter: ","});
    filesSystem.writeFileSync(GENERAL_CONFIG.pathToNewDatasetFile, csv, "utf8");
    console.log("Dataset saved!")
}

function getDataset()
{
    let text = filesSystem.readFileSync(GENERAL_CONFIG.pathToOldDatasetFile, { encoding: 'utf8'});
    return csvParse(text, {columns: true, skip_empty_lines: true});
}
function timeConversion(ms)
{
    let seconds = (ms / 1000).toFixed(1);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);

    if (seconds < 60) {
        return seconds + " Sec";
    } else if (minutes < 60) {
        return minutes + " Min";
    } else if (hours < 24) {
        return hours + " Hrs";
    } else {
        return days + " Days"
    }
}

function showProgress(currentNumberOfResults, totalNumberOfResults, beginTime)
{
    const timeElapsed = timeConversion(new Date() - beginTime);
    console.log(`Progress ${currentNumberOfResults}/${totalNumberOfResults} (${100.0 * currentNumberOfResults/totalNumberOfResults} %) (${timeElapsed} elapsed)`);
}

async function labeWithUserInput(dataLine)
{
    process.stdin.setRawMode(true);
    process.stdin.setEncoding( 'utf8' );
    return new Promise(resolve =>
        process.stdin.on('data', key =>
        {
            if(key === "o")
            {
                dataLine.class = "descriptive";
                process.stdin.setRawMode(false);
                resolve(dataLine);
            }
            else if(key === "n")
            {
                dataLine.class = "non descriptive";
                process.stdin.setRawMode(false);
                resolve(dataLine);
            }
        })
    );
}

(async () =>
{
    //Read the dataset file
    let dataset = getDataset();

    //Getting all webpages paths
    let allWebPagePaths = filesSystem.readdirSync(GENERAL_CONFIG.pathToWebPagesFolder, { encoding: 'utf8', withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .flatMap(dirent =>
        {
            let basePath = `${GENERAL_CONFIG.pathToWebPagesFolder}${dirent.name}/`;
            return filesSystem.readdirSync(basePath, { encoding: 'utf8', withFileTypes: true })
                .filter(dirent1 => dirent1.isFile())
                .map(dirent1 => `${basePath}${dirent1.name}`)
        });


    //Adding labelling system
    const browser = await puppeteer.launch({headless: false, defaultViewport: null, args: ['--start-maximized']});
    let tab = await browser.newPage();

    //Progress variables
    let totalNumberOfResults = dataset.length;
    let currentNumberOfResults = 0;
    let initTime = new Date();
    showProgress(currentNumberOfResults, totalNumberOfResults, initTime);

    for(let i = 0; i < dataset.length; i++)
    {
        //If not labelled
        if(!GENERAL_CONFIG.classPossibleValues.includes(dataset[i].class))
        {
            //Label it!!!
            let fileName = dataset[i].fileName;

            //Find associated web page
            let array = fileName.split(".")[0].split("_");
            array.pop();
            let folderName = array.join("_");

            //Open the tab with the associated web page
            await tab.setContent(filesSystem.readFileSync(`${GENERAL_CONFIG.pathToWebPagesFolder}${folderName}/${fileName}`, 'utf8'));

            //Wait for the decision of the human
            dataset[i] = await labeWithUserInput(dataset[i]);

            //Save progress every 5 webpages
            if(i!== 0 && i%5 === 0)
            {
                await saveDataset(dataset);
                dataset = getDataset();
            }
        }

        //Show progress
        currentNumberOfResults++;
        showProgress(currentNumberOfResults, totalNumberOfResults, initTime);
    }

    //Export new dataset
    await saveDataset(dataset);
})();