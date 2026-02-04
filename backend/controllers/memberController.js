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
            const exists = await Member.findOne({ memberCode });
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

        // If no user (unprotected access for Management IT), show all or filter via query
        let matchStage = {};

        /*
        if (req.user) {
            matchStage.branchId = branchId;
            if (role === 'manager') {
                if (queryFvId) {
                    matchStage.fieldVisitorId = new (require('mongoose')).Types.ObjectId(queryFvId);
                }
            } else {
                matchStage.fieldVisitorId = new (require('mongoose')).Types.ObjectId(userId);
            }
        }
        */
        // If unauthenticated, we don't apply any strict filters by default unless passed in query
        if (queryFvId && !req.user) { // Allow manual filter even if not logged in
            matchStage.fieldVisitorId = new (require('mongoose')).Types.ObjectId(queryFvId);
        }

        const fs = require('fs');
        const logMsg = `[getMembers] Time: ${new Date().toISOString()}, Role: ${role}, UserID: ${userId}, Branch: ${branchId}, MatchStage: ${JSON.stringify(matchStage)}\n`;
        fs.appendFileSync('debug_log.txt', logMsg);

        console.log(`[getMembers] Role: ${role}, Match:`, JSON.stringify(matchStage));

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Aggregation pipeline
        const pipeline = [
            { $match: matchStage },
            // Lookup transactions
            {
                $lookup: {
                    from: 'transactions',
                    localField: '_id',
                    foreignField: 'memberId',
                    as: 'transactions'
                }
            },
            // Add transaction counts and sums (preserves members without transactions)
            // FILTER ONLY CURRENT MONTH TRANSACTIONS
            {
                $addFields: {
                    transactionCount: { $size: '$transactions' },
                    buyTransactions: {
                        $filter: {
                            input: '$transactions',
                            as: 'tx',
                            cond: {
                                $and: [
                                    { $eq: ['$$tx.type', 'buy'] }
                                ]
                            }
                        }
                    },
                    sellTransactions: {
                        $filter: {
                            input: '$transactions',
                            as: 'tx',
                            cond: {
                                $and: [
                                    { $eq: ['$$tx.type', 'sell'] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    totalBuyAmount: { $ifNull: [{ $sum: '$buyTransactions.totalAmount' }, 0] },
                    totalSellAmount: { $ifNull: [{ $sum: '$sellTransactions.totalAmount' }, 0] },
                    totalBuyQuantity: { $ifNull: [{ $sum: '$buyTransactions.quantity' }, 0] },
                    totalSellQuantity: { $ifNull: [{ $sum: '$sellTransactions.quantity' }, 0] }
                }
            },
            // Apply search filter if provided
            ...(search ? [{
                $match: {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { mobile: { $regex: search, $options: 'i' } },
                        { memberCode: { $regex: search, $options: 'i' } },
                        { address: { $regex: search, $options: 'i' } }
                    ]
                }
            }] : []),
            // Sort by registration date descending
            { $sort: { registeredAt: -1 } },
            // Lookup Field Visitor details
            {
                $lookup: {
                    from: 'fieldvisitors',
                    localField: 'fieldVisitorId',
                    foreignField: '_id',
                    as: 'fieldVisitor'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    mobile: 1,
                    email: 1, // Ensure email is projected
                    address: 1,
                    nic: 1,
                    memberCode: 1,
                    fieldVisitorId: 1,
                    fieldVisitorCode: { $arrayElemAt: ['$fieldVisitor.userId', 0] },
                    fieldVisitorName: {
                        $let: {
                            vars: { fv: { $arrayElemAt: ['$fieldVisitor', 0] } },
                            in: { $ifNull: ['$$fv.fullName', '$$fv.name'] }
                        }
                    },
                    area: 1,
                    transactionCount: 1,
                    buyTransactionCount: { $size: '$buyTransactions' },
                    sellTransactionCount: { $size: '$sellTransactions' },
                    totalBuyAmount: 1,
                    totalSellAmount: 1,
                    totalBuyQuantity: 1,
                    totalSellQuantity: 1,
                    totalSellQuantity: 1,
                    registeredAt: 1,
                    joinedDate: 1, // Project joinedDate
                    registrationData: 1 // Add this to projection
                }
            }
        ];

        const members = await Member.aggregate(pipeline);
        console.log(`[getMembers] Found ${members.length} members with transactions`);

        // Format for mobile app with multiple field name options for compatibility
        const data = members.map(m => ({
            id: m._id?.toString() || m.id,
            _id: m._id,
            name: m.name,
            full_name: m.name, // Alias for Flutter compatibility
            mobile: m.mobile,
            email: m.email || '', // Include email in response
            address: m.address,
            postal_address: m.address, // Alias for Flutter compatibility
            nic: m.nic,
            member_code: m.memberCode,
            memberCode: m.memberCode, // Alternative field name
            fieldVisitorId: m.fieldVisitorCode || m.fieldVisitorId, // Return helper code (FV-...) if avail, else fallback to ObjID
            fieldVisitorName: m.fieldVisitorName || 'Unknown',
            area: m.area,
            transactionCount: m.transactionCount,
            totalBuyAmount: m.totalBuyAmount || 0,
            totalSellAmount: m.totalSellAmount || 0,
            totalBuyQuantity: m.totalBuyQuantity || 0,
            totalSellQuantity: m.totalSellQuantity || 0,
            totalBuyQuantity: m.totalBuyQuantity || 0,
            totalSellQuantity: m.totalSellQuantity || 0,
            registeredAt: m.joinedDate || m.registeredAt, // Prioritize joinedDate which we know is correct
            registrationData: m.registrationData || {} // Include registrationData
        }));

        console.log(`[getMembers] Returning ${data.length} formatted members`);
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
            member.mobile = mobile || member.mobile;
            member.email = email || member.email;
            member.nic = nic || member.nic;
            member.memberCode = memberCode || member.memberCode;
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
                        { memberCode: codeStr },
                        { mobile: phoneStr }
                    ]
                });

                if (existing) {
                    // Update existing member if memberCode matches
                    if (existing.memberCode === codeStr) {
                        console.log(`[Import] Row ${index + 1}: Updating member ${codeStr}`); // DEBUG LOG
                        existing.name = name;
                        existing.mobile = phoneStr;
                        existing.address = address || existing.address;
                        existing.nic = nic || existing.nic;
                        existing.email = email || existing.email;

                        await existing.save();
                        updatedCount++;
                    } else {
                        console.log(`[Import] Row ${index + 1} SKIPPED: Conflict. Code: ${codeStr}, Phone: ${phoneStr} exists as ${existing.memberCode}`); // DEBUG LOG
                        // Phone number duplicate but different memberCode
                        skippedCount++;
                        skippedDetails.push({
                            rowIndex: index + 2,
                            reason: 'Phone number already used by another Member',
                            data: { memberCode: codeStr, mobile: phoneStr, conflictId: existing.memberCode }
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
                    memberCode: codeStr,
                    mobile: phoneStr,
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

module.exports = { registerMember, getMembers, updateMember, deleteMember, importMembers };
