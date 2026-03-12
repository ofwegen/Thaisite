import fs from 'fs';

async function fetchNodes() {
    const response = await fetch('http://davidpi.totddns.com:42852/tree_nodes.js');
    // The original site uses iso-8859-1 (latin1) charset, so we must decode accordingly
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    let scriptText = decoder.decode(buffer);

    // Extract TREE_NODES using a simple Function wrapper
    let treeNodes;
    try {
        const fn = new Function('var TREE_NODES; ' + scriptText + ' return TREE_NODES;');
        treeNodes = fn();
    } catch (e) { console.error("Error evaluating tree nodes:", e); }
    return treeNodes;
}

function extractVariableBlock(text, varName) {
    const startStr = `${varName} = new Array();`;
    const startIndex = text.indexOf(startStr);
    if (startIndex === -1) return null;

    // safe block extraction
    const endIndex = text.indexOf("function ", startIndex);
    let blockText = text.substring(startIndex, endIndex !== -1 ? endIndex : text.length);
    return blockText;
}

function cleanHtml(htmlStr) {
    if (!htmlStr) return "";
    return htmlStr.replace(/<[^>]*>?/gm, '').trim();
}

function extractAudioUrl(htmlStr, basePath) {
    if (!htmlStr) return null;
    const match = htmlStr.match(/window\.open\('([^']+)'/);
    if (match) {
        // Many audio files start with 'snd/'. We must construct the absolute URL.
        // If basePath is 'http://.../unit01/exc01/', and relative is 'snd/u01_0101a.mp3'
        // Result: 'http://.../unit01/exc01/snd/u01_0101a.mp3'
        return new URL(match[1], basePath).href;
    }
    return null;
}

function extractImageSrc(htmlStr, basePath) {
    if (!htmlStr) return null;
    const match = htmlStr.match(/<img[^>]+src="([^"]+)"/i);
    if (match) {
        // e.g., 'pix/22.jpg'
        return new URL(match[1], basePath).href;
    }
    return null;
}

async function scrapeExercise(urlPath) {
    try {
        const url = `http://davidpi.totddns.com:42852/${urlPath}`;
        // E.g., from 'http://domain/unit01/exc01/ex1.htm' to 'http://domain/unit01/exc01/'
        const basePath = url.substring(0, url.lastIndexOf('/') + 1);

        const response = await fetch(url);
        const text = await response.text();

        const fBlock = extractVariableBlock(text, "F");
        const dBlock = extractVariableBlock(text, "D");

        if (!fBlock || !dBlock) return [];

        // Execute the array definitions
        const evalData = new Function(`
        var F; var D;
        try {
            ${fBlock}
            ${dBlock}
        } catch(e) {}
        return { F, D };
    `);

        const { F, D } = evalData();
        if (!F || !D) return [];

        const exercises = [];

        for (let i = 0; i < F.length; i++) {
            const fItem = F[i];
            if (!fItem) continue;

            const fHtml = fItem[0];
            const fId = fItem[1];

            const dItem = D.find(d => d[1] === fId);
            const dHtml = dItem ? dItem[0] : "";

            exercises.push({
                id: i,
                matchId: fId,
                targetHtml: fHtml,
                targetText: cleanHtml(fHtml),
                targetImage: extractImageSrc(fHtml, basePath),
                targetAudio: extractAudioUrl(fHtml, basePath),
                soundHtml: dHtml,
                soundText: cleanHtml(dHtml) || "Sound",
                soundAudio: extractAudioUrl(dHtml, basePath),
                soundImage: extractImageSrc(dHtml, basePath),
            });
        }

        return exercises;
    } catch (err) {
        console.error(`Failed to parse ${urlPath}`, err.message);
        return [];
    }
}

async function run() {
    const treeNodes = await fetchNodes();
    console.log("Extracted Tree Nodes:", !!treeNodes);

    const allContent = [];

    for (const node of treeNodes) {
        if (!Array.isArray(node)) continue;

        const unitTitle = node[0];
        const unitPdfRelative = node[1]; // e.g. "unit01/pdf/u01.pdf"

        // Let's also extract the main PDF if it exists
        const unitPdfAbsolute = unitPdfRelative.includes('.pdf')
            ? new URL(unitPdfRelative, 'http://davidpi.totddns.com:42852/').href
            : null;

        const items = node.slice(3);

        let exercisesForUnit = [];
        let pdfsForUnit = [];

        for (const item of items) {
            if (Array.isArray(item)) {
                const title = item[0];
                const link = item[1];

                if (link.includes('.htm')) {
                    console.log(`Scraping: ${unitTitle} -> ${title}`);
                    const exerData = await scrapeExercise(link);
                    if (exerData && exerData.length > 0) {
                        exercisesForUnit.push({
                            type: 'dnd',
                            title: title,
                            path: link,
                            data: exerData
                        });
                    }
                } else if (link.includes('.pdf')) {
                    pdfsForUnit.push({
                        type: 'pdf',
                        title: title,
                        path: link,
                        url: new URL(link, 'http://davidpi.totddns.com:42852/').href
                    });
                }
            }
        }

        // We will merge Exercises + Sub-PDFs into one big "pages" list for the sidebar
        const pages = [...exercisesForUnit, ...pdfsForUnit];

        if (pages.length > 0 || unitPdfAbsolute) {
            allContent.push({
                unit: unitTitle,
                unitPdfUrl: unitPdfAbsolute,
                pages: pages
            });
        }
    }

    fs.writeFileSync('src/assets/content.json', JSON.stringify(allContent, null, 2));
    console.log(`Saved units to src/assets/content.json`);
}

run();
