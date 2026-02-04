import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/sms_service.dart';

class BulkSmsDialog extends StatefulWidget {
  const BulkSmsDialog({super.key});

  @override
  State<BulkSmsDialog> createState() => _BulkSmsDialogState();
}

class _BulkSmsDialogState extends State<BulkSmsDialog> {
  final TextEditingController _messageCtrl = TextEditingController();
  String _selectedTarget = 'managers'; // managers, field_visitors, all

  bool _isSending = false;
  String? _statusMessage;
  bool _isSuccess = false;

  final Map<String, String> _targetOptions = {
    'managers': 'All Branch Managers',
    'field_visitors': 'All Field Visitors',
    // 'all': 'Everyone (Managers + FV)' // Backend support pending for 'all'
  };

  Future<void> _sendSms() async {
    if (_messageCtrl.text.trim().isEmpty) {
      setState(() {
        _statusMessage = 'Please enter a message';
        _isSuccess = false;
      });
      return;
    }

    setState(() {
      _isSending = true;
      _statusMessage = null;
    });

    final criteria = {
      'role': _selectedTarget == 'managers' ? 'manager' : 'field_visitor',
    };

    final result = await SmsService.sendBulkSms(
      message: _messageCtrl.text.trim(),
      criteria: criteria,
    );

    if (mounted) {
      setState(() {
        _isSending = false;
        _isSuccess = result['success'];
        _statusMessage = result['message'];

        if (_isSuccess) {
          // Clear message on success
          _messageCtrl.clear();
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1F2937),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Send Bulk SMS',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.grey),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Target Selection
                Text('To:', style: GoogleFonts.outfit(color: Colors.grey)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF374151),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedTarget,
                      dropdownColor: const Color(0xFF374151),
                      style: GoogleFonts.outfit(color: Colors.white),
                      isExpanded: true,
                      items: _targetOptions.entries.map((e) {
                        return DropdownMenuItem(
                          value: e.key,
                          child: Text(e.value),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedTarget = val);
                      },
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Message Input
                Text('Message:', style: GoogleFonts.outfit(color: Colors.grey)),
                const SizedBox(height: 8),
                TextField(
                  controller: _messageCtrl,
                  maxLines: 5,
                  style: GoogleFonts.outfit(color: Colors.white),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF374151),
                    hintText: 'Type your message here...',
                    hintStyle: GoogleFonts.outfit(color: Colors.grey[500]),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),

                const SizedBox(height: 10),

                // Status Message
                if (_statusMessage != null)
                  Container(
                    padding: const EdgeInsets.all(8),
                    width: double.infinity,
                    color: _isSuccess
                        ? Colors.green.withValues(alpha: 0.2)
                        : Colors.red.withValues(alpha: 0.2),
                    child: Text(
                      _statusMessage!,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(
                        color: _isSuccess ? Colors.green : Colors.red,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                const SizedBox(height: 20),

                // Send Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isSending ? null : _sendSms,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueAccent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: _isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send, color: Colors.white),
                    label: Text(
                      _isSending ? 'SENDING...' : 'SEND MESSAGE',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
