const Member = require('../models/Member');
const mongoose = require('mongoose');


// @desc    Register a member
// @route   POST /api/members
// @access  Private/FieldVisitor
const registerMember = async (req, res, next) => {
    try {
        const { name, address, mobile, email, nic, memberCode, registrationData } = req.body;
        const branchId = req.user?.branchId || 'default-branch';

        // Validate required fields
        if (!name || !address || !mobile || !nic) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, address, mobile, nic'
            });
        }

        // Ensure memberCode is unique if provided
        if (memberCode) {
            const exists = await Member.findOne({ memberId: memberCode });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Member code already exists'
                });
            }
        }

        // Resolve Field Visitor ID
        let fvId = req.user ? req.user._id : undefined;
        if (req.body.fieldVisitorId) {
            const inputId = req.body.fieldVisitorId;
            if (mongoose.Types.ObjectId.isValid(inputId)) {
                fvId = inputId;
            } else {
                // Try looking up by userId (code)
                const fv = await require('../models/FieldVisitor').findOne({ userId: inputId });
                if (fv) {
                    fvId = fv._id;
                } else {
                    // Fallback or error? For now, if code invalid, keep existing logic (maybe undefined or current user)
                    // But if Manager is adding, they expect it to work.
                    // Let's log warning
                    console.warn(`Field Visitor with code ${inputId} not found.`);
                }
            }
        }

        // Create new member instance
        const newMember = new Member({
            name,
            address,
            contact: mobile,
            memberId: memberCode || `MEM-${Date.now()}`,
            email,
            nic,
            registrationData,
            fieldVisitorId: fvId,
            branchId
        });

        // Await the save operation properly
        const savedMember = await newMember.save();

        // Return the saved document immediately
        res.status(201).json({
            success: true,
            message: 'Member registered successfully',
            data: savedMember
        });
    } catch (error) {
        console.error('Member Registration Error:', error);

        // Duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Member with this code or data already exists'
            });
        }

        // Mongoose validation error
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        // General server error
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// @desc    Get members - Only show members assigned to current Field Visitor with transactions
// @route   GET /api/members
// @access  Private
const getMembers = async (req, res) => {
    try {
        const { search, fieldVisitorId: queryFvId } = req.query;
        const branchId = req.user?.branchId;
        const userId = req.user?._id;
        const role = req.user?.role;

        const startTime = Date.now();
        console.log(`[getMembers] Request by Role: ${role}, UserID: ${userId}, Branch: ${branchId}`);

        // Restore filtering logic
        let matchStage = {};
        const isAdmin = (role === 'admin' || role === 'it_sector' || role === 'analyzer');

        if (req.user && !isAdmin) {
            matchStage.branchId = branchId;
            if (role === 'field_visitor') {
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    matchStage.fieldVisitorId = new mongoose.Types.ObjectId(userId);
                } else {
                    matchStage.fieldVisitorId = userId;
                }
            } else if (role === 'manager' && queryFvId) {
                if (mongoose.Types.ObjectId.isValid(queryFvId)) {
                    matchStage.fieldVisitorId = new mongoose.Types.ObjectId(queryFvId);
                } else {
                    matchStage.fieldVisitorId = queryFvId;
                }
            }
        } else if (queryFvId) {
            // Admins/IT can filter by FV if provided
            if (mongoose.Types.ObjectId.isValid(queryFvId)) {
                matchStage.fieldVisitorId = new mongoose.Types.ObjectId(queryFvId);
            } else {
                matchStage.fieldVisitorId = queryFvId;
            }
        }

        const FieldVisitor = require('../models/FieldVisitor');
        const Transaction = require('../models/Transaction');

        // 1. Fetch Field Visitors
        const fieldVisitors = await FieldVisitor.find({}).select('userId fullName name').lean();
        const fvMap = {};
        fieldVisitors.forEach(fv => {
            fvMap[fv._id.toString()] = fv;
        });

        // 2. Fetch Members
        const dbMatch = { ...matchStage };
        if (search) {
            const s = new RegExp(search, 'i');
            dbMatch.$or = [
                { name: s },
                { contact: s },
                { mobile: s },
                { memberId: s },
                { memberCode: s },
                { address: s }
            ];
        }

        const members = await Member.find(dbMatch).select('-transactions -registrationData -signatureImage -profileImage -documentPdf').lean().sort({ joinedDate: -1 });

        // 3. Aggregate Transactions (grouped by memberId) - Optimized
        const memberIds = members.map(m => m._id);
        const txStats = await Transaction.aggregate([
            {
                $match: {
                    memberId: { $in: memberIds }
                }
            },
            {
                $group: {
                    _id: '$memberId',
                    count: { $sum: 1 },
                    buyCount: {
                        $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] }
                    },
                    sellCount: {
                        $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] }
                    },
                    totalBuyAmount: {
                        $sum: { $cond: [{ $eq: ['$type', 'buy'] }, '$totalAmount', 0] }
                    },
                    totalSellAmount: {
                        $sum: { $cond: [{ $eq: ['$type', 'sell'] }, '$totalAmount', 0] }
                    },
                    totalBuyQuantity: {
                        $sum: { $cond: [{ $eq: ['$type', 'buy'] }, '$quantity', 0] }
                    },
                    totalSellQuantity: {
                        $sum: { $cond: [{ $eq: ['$type', 'sell'] }, '$quantity', 0] }
                    }
                }
            }
        ]);

        const txMap = {};
        txStats.forEach(stat => {
            if (stat._id) {
                txMap[stat._id.toString()] = stat;
            }
        });

        // 4. Merge and map
        const data = members.map(m => {
            const fv = m.fieldVisitorId ? fvMap[m.fieldVisitorId.toString()] : null;
            const tx = txMap[m._id.toString()] || {
                count: 0, buyCount: 0, sellCount: 0,
                totalBuyAmount: 0, totalSellAmount: 0,
                totalBuyQuantity: 0, totalSellQuantity: 0
            };

            return {
                id: m._id?.toString() || m.id,
                _id: m._id,
                name: m.name,
                full_name: m.name,
                mobile: m.contact || m.mobile || '',
                email: m.email || '',
                address: m.address || '',
                postal_address: m.address || '',
                nic: m.nic || '',
                member_code: m.memberId || m.memberCode || '',
                memberCode: m.memberId || m.memberCode || '',
                fieldVisitorId: fv?.userId || m.fieldVisitorId?.toString() || '',
                fieldVisitorName: fv ? (fv.fullName || fv.name) : 'Unknown',
                area: m.area || '',
                transactionCount: tx.count,
                buyTransactionCount: tx.buyCount,
                sellTransactionCount: tx.sellCount,
                totalBuyAmount: tx.totalBuyAmount,
                totalSellAmount: tx.totalSellAmount,
                totalBuyQuantity: tx.totalBuyQuantity,
                totalSellQuantity: tx.totalSellQuantity,
                registeredAt: m.joinedDate || m.registeredAt,
                joinedDate: m.joinedDate || m.registeredAt,
                registrationData: m.registrationData || {}
            };
        });

        const duration = Date.now() - startTime;
        console.log(`[getMembers] Returning ${data.length} members. Duration: ${duration}ms`);
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('[getMembers] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve members',
            error: error.message
        });
    }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private/Manager
const updateMember = async (req, res) => {
    try {
        const { name, address, mobile, email, nic, memberCode, registrationData } = req.body;
        const member = await Member.findById(req.params.id);

        if (member) {
            member.name = name || member.name;
            member.address = address || member.address;
            member.contact = mobile || member.contact;
            member.email = email || member.email;
            member.nic = nic || member.nic;
            member.memberId = memberCode || member.memberId;
            member.registrationData = registrationData || member.registrationData;

            const updatedMember = await member.save();
            res.json(updatedMember);
        } else {
            res.status(404);
            throw new Error('Member not found');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed', error: error.message });
    }
};

const Transaction = require('../models/Transaction'); // Ensure Transaction is imported at top if not keys

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private/Manager
const deleteMember = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);

        if (member) {
            // Delete associated transactions first
            await Transaction.deleteMany({ memberId: member._id });
            // Then delete the member
            await member.deleteOne();
            res.json({ message: 'Member and their transactions removed' });
        } else {
            res.status(404);
            throw new Error('Member not found');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Delete failed', error: error.message });
    }
};

// @desc    Import Members from Excel data
// @route   POST /api/members/import
// @access  Private
const importMembers = async (req, res) => {
    try {
        const { rows } = req.body;

        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of rows.' });
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        const normalizeKey = (obj, keys) => {
            const objKeys = Object.keys(obj);
            for (const key of keys) {
                const found = objKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
                if (found) return obj[found];
            }
            return undefined;
        };

        const skippedDetails = [];

        for (const [index, row] of rows.entries()) {
            console.log(`[Import] Processing row ${index + 1}:`, JSON.stringify(row)); // DEBUG LOG
            try {
                // Map Excel headers (flexible matching)
                const name = normalizeKey(row, ['Name', 'Full Name', 'Member Name']);
                const memberCode = normalizeKey(row, ['Member Code', 'memberCode', 'Code', 'ID']);
                const mobile = normalizeKey(row, ['Mobile', 'Phone', 'Contact', 'mobile', 'phone']);
                const address = normalizeKey(row, ['Address', 'Postal Address', 'address']);
                const nic = normalizeKey(row, ['NIC', 'nic', 'National ID']);
                const email = normalizeKey(row, ['Email', 'email']);

                const phoneStr = mobile ? String(mobile) : '';
                const codeStr = memberCode ? String(memberCode) : '';

                if (!name || !codeStr || !phoneStr) {
                    console.log(`[Import] Row ${index + 1} SKIPPED: Missing fields. Name: ${name}, Code: ${codeStr}, Phone: ${phoneStr}`); // DEBUG LOG
                    skippedCount++;
                    skippedDetails.push({
                        rowIndex: index + 2,
                        reason: 'Missing required fields (Name, Code, or Phone)',
                        data: { name, memberCode: codeStr, mobile: phoneStr }
                    });
                    continue;
                }

                // Check for existing member
                const existing = await Member.findOne({
                    $or: [
                        { memberId: codeStr },
                        { contact: phoneStr }
                    ]
                });

                if (existing) {
                    // Update existing member if memberCode matches
                    if (existing.memberId === codeStr) {
                        console.log(`[Import] Row ${index + 1}: Updating member ${codeStr}`); // DEBUG LOG
                        existing.name = name;
                        existing.contact = phoneStr;
                        existing.address = address || existing.address;
                        existing.nic = nic || existing.nic;
                        existing.email = email || existing.email;

                        await existing.save();
                        updatedCount++;
                    } else {
                        console.log(`[Import] Row ${index + 1} SKIPPED: Conflict. Code: ${codeStr}, Phone: ${phoneStr} exists as ${existing.memberId}`); // DEBUG LOG
                        // Phone number duplicate but different memberId
                        skippedCount++;
                        skippedDetails.push({
                            rowIndex: index + 2,
                            reason: 'Phone number already used by another Member',
                            data: { memberCode: codeStr, mobile: phoneStr, conflictId: existing.memberId }
                        });
                    }
                    continue;
                }

                console.log(`[Import] Row ${index + 1}: Inserting new member ${codeStr}`); // DEBUG LOG

                // Create new Member
                const fieldVisitorId = req.user?.role === 'field_visitor' ? req.user._id : undefined;
                const branchId = req.user?.branchId || 'default-branch';

                // Extract extra fields for registrationData
                const landSize = normalizeKey(row, ['Land Size', 'landSize', 'Land']);
                const quantityPlants = normalizeKey(row, ['Quantity Plants', 'quantityPlants', 'Plants', 'Quantity']);
                const activity = normalizeKey(row, ['Activity', 'activity']);
                const waterFacility = normalizeKey(row, ['Water Facility', 'waterFacility', 'Water']);
                const electricity = normalizeKey(row, ['Electricity', 'electricity']);
                const machinery = normalizeKey(row, ['Machinery', 'machinery']);
                const residentOccupation = normalizeKey(row, ['Resident Occupation', 'occupation', 'Job']);
                const residentEducation = normalizeKey(row, ['Resident Education', 'education']);
                const residentDob = normalizeKey(row, ['Resident DOB', 'dob', 'Date of Birth']);

                const registrationData = {
                    landSize: landSize ? String(landSize) : undefined,
                    quantityPlants: quantityPlants ? String(quantityPlants) : undefined,
                    activity: activity ? String(activity) : undefined,
                    waterFacility: waterFacility ? String(waterFacility) : undefined,
                    electricity: electricity ? String(electricity) : undefined,
                    machinery: machinery ? String(machinery) : undefined,
                    resident_occupation: residentOccupation ? String(residentOccupation) : undefined,
                    resident_education: residentEducation ? String(residentEducation) : undefined,
                    resident_dob: residentDob ? String(residentDob) : undefined,
                    // Auto-fill Normalized Mobile
                    mobile_normalized: phoneStr.startsWith('+') ? phoneStr : `+94${phoneStr.replace(/^0/, '')}`
                };

                const newMember = new Member({
                    name,
                    memberId: codeStr,
                    contact: phoneStr,
                    address: address || '',
                    nic: nic || '',
                    email: email || '',
                    fieldVisitorId,
                    branchId,
                    registrationData // Save the extra data
                });

                await newMember.save();
                insertedCount++;
            } catch (err) {
                console.error(`[Import] Row ${index + 1} ERROR:`, err.message); // DEBUG LOG
                skippedCount++;
                skippedDetails.push({
                    rowIndex: index + 2,
                    reason: err.message,
                    data: row
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Import completed',
            data: {
                insertedCount,
                updatedCount,
                skippedCount,
                skippedDetails,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, message: 'Import failed', error: error.message });
    }
};

// @desc    Get member statistics for dashboard
// @route   GET /api/members/stats
// @access  Private
const getMemberStats = async (req, res) => {
    try {
        const branchId = req.user?.branchId;
        const role = req.user?.role;
        const userId = req.user?._id;

        const startTime = Date.now();
        const isAdmin = (role === 'admin' || role === 'it_sector' || role === 'analyzer');

        const matchStage = {};
        if (req.user && !isAdmin) {
            matchStage.branchId = branchId;
            if (role === 'field_visitor') {
                if (mongoose.Types.ObjectId.isValid(userId)) {
                    matchStage.fieldVisitorId = new mongoose.Types.ObjectId(userId);
                } else {
                    matchStage.fieldVisitorId = userId;
                }
            }
        }

        // 1. Get Total Count
        const totalCount = await Member.countDocuments(matchStage);

        // 2. Get Monthly New Members (Last 12 months)
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const monthlyStats = await Member.aggregate([
            {
                $match: {
                    ...matchStage,
                    joinedDate: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$joinedDate" },
                        month: { $month: "$joinedDate" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Format chart data (series)
        const series = Array(12).fill(0);
        monthlyStats.forEach(stat => {
            const statDate = new Date(stat._id.year, stat._id.month - 1, 1);
            let diff = (now.getFullYear() - statDate.getFullYear()) * 12 + (now.getMonth() - statDate.getMonth());
            let index = 11 - diff;
            if (index >= 0 && index < 12) {
                series[index] = stat.count;
            }
        });

        const duration = Date.now() - startTime;
        console.log(`[getMemberStats] Complete in ${duration}ms. Count: ${totalCount}`);

        res.json({
            success: true,
            data: {
                totalCount,
                series
            }
        });
    } catch (error) {
        console.error('[getMemberStats] Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private
const getMember = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id).lean();
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        console.error('[getMember] Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    registerMember,
    getMembers,
    getMember,
    getMemberStats,
    updateMember,
    deleteMember,
    importMembers
};
