const Member = require('../models/Member');
const mongoose = require('mongoose');
const { broadcast, EVENTS } = require('../utils/socketManager');


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

        // Parse registrationData from string if it came from multipart/form-data
        let parsedRegistrationData = {};
        if (registrationData) {
            try {
                parsedRegistrationData = typeof registrationData === 'string' ? JSON.parse(registrationData) : registrationData;
            } catch (e) {
                console.warn('Could not parse registrationData:', e);
            }
        }

        // Attach S3 uploaded file URLs
        if (req.files) {
            if (req.files.profileImage && req.files.profileImage[0]) {
                parsedRegistrationData.profileImageUrl = req.files.profileImage[0].location;
            }
            if (req.files.documentPdf && req.files.documentPdf[0]) {
                parsedRegistrationData.documentPdfUrl = req.files.documentPdf[0].location;
            }
        }

        // Resolve Field Visitor ID
        let fvId = req.user ? req.user._id : undefined;
        if (req.body.fieldVisitorId && req.body.fieldVisitorId !== 'null' && req.body.fieldVisitorId !== '') {
            const inputId = req.body.fieldVisitorId;
            if (mongoose.Types.ObjectId.isValid(inputId)) {
                fvId = inputId;
            } else {
                // Try looking up by userId (code)
                const fv = await require('../models/FieldVisitor').findOne({ userId: inputId });
                if (fv) {
                    fvId = fv._id;
                } else {
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
            registrationData: parsedRegistrationData,
            fieldVisitorId: fvId,
            branchId
        });

        // Await the save operation properly
        const savedMember = await newMember.save();

        // Return the saved document immediately
        broadcast(EVENTS.MEMBER_ADDED, savedMember);

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
        if (queryFvId && !req.user) {
            matchStage.fieldVisitorId = new (require('mongoose')).Types.ObjectId(queryFvId);
        }

        const fs = require('fs');
        const startTime = Date.now();
        const Member = require('../models/Member');
        const Transaction = require('../models/Transaction');
        const FieldVisitor = require('../models/FieldVisitor');

        const logMsgPrefix = `[getMembers] Starting at ${new Date().toISOString()}, User: ${userId}\n`;
        fs.appendFileSync('debug_log.txt', logMsgPrefix);

        // Diagnostic: Fetch FieldVisitors first
        const fvStart = Date.now();
        const fieldVisitors = await FieldVisitor.find({}).select('userId fullName name').lean();
        const fvEnd = Date.now();
        fs.appendFileSync('debug_log.txt', `[getMembers] FieldVisitor fetch took ${fvEnd - fvStart}ms. Count: ${fieldVisitors.length}\n`);

        const transStart = Date.now();
        const transactions = []; // skip fetching all transactions
        const transEnd = Date.now();

        const memStart = Date.now();
        const members = await Member.find(matchStage)
            .select('name contact mobile email nic address memberId memberCode fieldVisitorId joinedDate registeredAt')
            .lean();
        const memEnd = Date.now();
        const fetchEnd = memEnd;
        fs.appendFileSync('debug_log.txt', `[getMembers] Member fetch took ${memEnd - memStart}ms. Count: ${members.length}\n`);

        // Index transactions and visitors for O(1) lookup
        const transMap = {};
        transactions.forEach(tx => {
            const mId = tx.memberId ? tx.memberId.toString() : 'null';
            if (!transMap[mId]) transMap[mId] = [];
            transMap[mId].push(tx);
        });

        const fvMap = {};
        fieldVisitors.forEach(fv => {
            fvMap[fv._id.toString()] = fv;
        });

        // Merge and process fast path
        let data = members.map(m => {
            const fv = m.fieldVisitorId ? fvMap[m.fieldVisitorId.toString()] : null;

            return {
                id: m._id?.toString(),
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
                transactionCount: 0,
                totalBuyAmount: 0,
                totalSellAmount: 0,
                totalBuyQuantity: 0,
                totalSellQuantity: 0,
                registeredAt: m.joinedDate || m.registeredAt,
                registrationAt: m.joinedDate || m.registeredAt,
                registrationData: m.registrationData || {}
            };
        });

        // Apply search filter if provided
        if (search) {
            const s = search.toLowerCase();
            data = data.filter(m =>
                m.name.toLowerCase().includes(s) ||
                m.mobile.includes(s) ||
                m.memberCode.toLowerCase().includes(s)
            );
        }

        // Sort by date
        data.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

        const fullEnd = Date.now();
        fs.appendFileSync('debug_log.txt', `[getMembers] Processing took ${fullEnd - fetchEnd}ms. Total: ${fullEnd - startTime}ms\n`);
        console.log(`[getMembers] Returning ${data.length} members`);
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('[getMembers] Error:', error);
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
            broadcast(EVENTS.MEMBER_UPDATED, updatedMember);
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
            broadcast(EVENTS.MEMBER_DELETED, { id: req.params.id });
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

module.exports = { registerMember, getMembers, updateMember, deleteMember, importMembers };
