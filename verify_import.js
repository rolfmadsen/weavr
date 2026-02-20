
const fs = require('fs');

const json = JSON.parse(fs.readFileSync('/home/rolfmadsen/Github/weavr/public/examples/weavr-model.json', 'utf8'));
const nodes = [];
const slices = [];
const sourceSlices = json.eventModel && json.eventModel.slices ? json.eventModel.slices : [];

sourceSlices.forEach((s, index) => {
    slices.push({
        id: s.id,
        title: s.title,
    });

    const elements = [
        ...(s.commands || []),
        ...(s.events || []),
        ...(s.readmodels || []),
        ...(s.screens || []),
        ...(s.processors || [])
    ];

    elements.forEach((el) => {
        nodes.push({
            id: String(el.id),
            sliceId: String(s.id),
        });
    });
});

console.log(`Found ${slices.length} slices and ${nodes.length} nodes.`);
if (slices.length > 0) {
    console.log(`First slice ID: ${slices[0].id}`);
    const nodesInFirst = nodes.filter(n => n.sliceId === slices[0].id);
    console.log(`Nodes in first slice: ${nodesInFirst.length}`);
}
