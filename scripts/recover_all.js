const fs = require('fs');
const path = require('path');

const files = ['user_check_utf8.txt', 'query_results_utf8_full.txt', 'login_results_final.txt', 'debug_data_out.txt'];

const recovery = {
    branchManagers: {},
    fieldVisitors: {},
    members: {},
    users: {}
};

files.forEach(file => {
    const filePath = path.resolve(__dirname, '..', file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');

    // Find everything between { and }
    // This is naive but often works for logs
    let depth = 0;
    let start = -1;

    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (content[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                const block = content.substring(start, i + 1);
                try {
                    // Try to fix common log artifacts like missing quotes or trailing commas
                    // Actually, let's just try to extract keys manually if JSON.parse fails
                    let obj = null;
                    try {
                        obj = JSON.parse(block.replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
                    } catch (e) {
                        // Fallback to regex extraction
                        obj = {};
                        const kvMatches = block.match(/"?(\w+)"?\s*:\s*"?([^",{}]+)"?/g);
                        if (kvMatches) {
                            kvMatches.forEach(kv => {
                                const parts = kv.split(':');
                                const k = parts[0].trim().replace(/"/g, '');
                                const v = parts[1].trim().replace(/"/g, '').replace(/,$/, '');
                                obj[k] = v;
                            });
                        }
                    }
                    if (obj) processObject(obj);
                } catch (err) {
                    // console.error('Failed to parse block');
                }
                start = -1;
            }
        }
    }
});

function processObject(obj) {
    if (!obj) return;

    const id = obj.userId || obj.ID || obj.id || obj.memberCode || obj.member_code;
    const role = obj.role || '';

    if (id && id.startsWith('BM-')) {
        recovery.branchManagers[id] = { ...recovery.branchManagers[id], ...obj };
    } else if (id && id.startsWith('FV-')) {
        recovery.fieldVisitors[id] = { ...recovery.fieldVisitors[id], ...obj };
    } else if (id && (id.startsWith('MEM-') || id.startsWith('M-') || obj.memberCode)) {
        const finalId = obj.memberCode || id;
        recovery.members[finalId] = { ...recovery.members[finalId], ...obj };
    } else if (obj._id && (role.includes('manager') || role.includes('Manager'))) {
        // Handle objects that don't have IDs but have role
        recovery.branchManagers[obj.userId || obj._id] = { ...recovery.branchManagers[obj.userId || obj._id], ...obj };
    }
}

fs.writeFileSync(path.resolve(__dirname, '../recovery_dictionary.json'), JSON.stringify(recovery, null, 2));
console.log('Recovery dictionary built.');
