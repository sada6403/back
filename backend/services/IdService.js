const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

class IdService {

    // 1. Generate Branch Code (Collision Aware)
    // "Colombo" -> "CO" normally. If "CO" taken by "Colony", try "COL", then "CON" etc.
    static async generateBranchCode(branchName) {
        if (!branchName) return 'GEN';

        const cleanName = branchName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (cleanName.length < 2) return 'XX';

        // Strategy: 
        // 1. Try first 2 letters.
        // 2. Check DB if any OTHER branch uses this code.
        //    (If same branch uses it, reuse it).

        let code = cleanName.substring(0, 2);

        // Find if this code is already used by a DIFFERENT branch
        // We look for any user who has this code BUT a different branchName
        let collision = await User.findOne({
            branchCode: code,
            branchName: { $ne: branchName } // Case sensitive check might be strict, usually regex better but strict for now
        });

        if (!collision) return code;

        // Collision found (e.g. 'CO' used by 'Colombo', but now we have 'Colony')
        // Try 3 letters
        if (cleanName.length >= 3) {
            code = cleanName.substring(0, 3);
            collision = await User.findOne({
                branchCode: code,
                branchName: { $ne: branchName }
            });
            if (!collision) return code;
        }

        // Try 4 letters
        if (cleanName.length >= 4) {
            code = cleanName.substring(0, 4);
            collision = await User.findOne({
                branchCode: code,
                branchName: { $ne: branchName }
            });
            if (!collision) return code;
        }

        // Fallback: Random or Sequential suffix? 
        // Let's generate a unique synthetic code if names are extremely similar
        // For simplicity in this iteration, we fallback to 2 chars + random digit
        return cleanName.substring(0, 2) + Math.floor(Math.random() * 9);
    }

    // 2. Generate Next User ID
    // Format: <RolePrefix>-<BranchCode>-<Sequence>
    static async generateUserId(role, branchCode, session = null) {
        let prefix = 'EMP';
        const rLower = role.toLowerCase();

        if (rLower.includes('branch manager') || rLower.includes('manager')) prefix = 'BM';
        if (rLower.includes('field')) prefix = 'FV';
        if (rLower.includes('it sector')) return null; // Manual ID for IT

        const pattern = `^${prefix}-${branchCode}-`;

        // Find latest ID matching this Pattern
        const query = User.findOne({ userId: new RegExp(pattern) })
            .sort({ userId: -1 })
            .collation({ locale: 'en_US', numericOrdering: true });

        if (session) query.session(session);

        const lastUser = await query.exec();

        let nextNum = 1;
        if (lastUser && lastUser.userId) {
            const parts = lastUser.userId.split('-');
            const numPart = parts[parts.length - 1];
            if (!isNaN(numPart)) {
                nextNum = parseInt(numPart) + 1;
            }
        }

        return `${prefix}-${branchCode}-${String(nextNum).padStart(3, '0')}`;
    }
}

module.exports = IdService;
