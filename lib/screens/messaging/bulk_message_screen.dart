import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
// import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;

import '../../config/api_config.dart';

class BulkMessageScreen extends StatefulWidget {
  const BulkMessageScreen({super.key});

  @override
  State<BulkMessageScreen> createState() => _BulkMessageScreenState();
}

class _BulkMessageScreenState extends State<BulkMessageScreen> {
  // SMS Tab Controllers
  final TextEditingController _smsMessageController = TextEditingController();
  bool _smsSendToManagers = false;
  bool _smsSendToFVs = false;
  bool _smsSendToMembers = false;

  // Email Tab Controllers
  final TextEditingController _emailMessageController = TextEditingController();
  bool _emailSendToManagers = false;
  bool _emailSendToFVs = false;
  bool _emailSendToMembers = false;
  // PlatformFile? _selectedFile;

  bool _isLoading = false;

  // Future<void> _pickFile() async {
  //   FilePickerResult? result = await FilePicker.platform.pickFiles();
  //   if (result != null) {
  //     setState(() {
  //       _selectedFile = result.files.first;
  //     });
  //   }
  // }

  // void _removeFile() {
  //   setState(() {
  //     _selectedFile = null;
  //   });
  // }

  Future<void> _sendWishes(bool isEmail) async {
    final messageCtrl = isEmail
        ? _emailMessageController
        : _smsMessageController;
    final toManagers = isEmail ? _emailSendToManagers : _smsSendToManagers;
    final toFVs = isEmail ? _emailSendToFVs : _smsSendToFVs;
    final toMembers = isEmail ? _emailSendToMembers : _smsSendToMembers;

    if (messageCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please enter a message')));
      return;
    }

    if (!toManagers && !toFVs && !toMembers) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one recipient group'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final List<String> roleGroups = [];
      if (toManagers) roleGroups.add('manager');
      if (toFVs) roleGroups.add('field_visitor');
      if (toMembers) roleGroups.add('member');

      final url = Uri.parse('${ApiConfig.baseUrl}/sms/bulk');
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      var request = http.MultipartRequest('POST', url);
      request.headers['Authorization'] = 'Bearer $token';

      request.fields['message'] = messageCtrl.text;
      request.fields['sendViaEmail'] = isEmail.toString();
      request.fields['roles'] = jsonEncode(roleGroups);

      // if (isEmail && _selectedFile != null && _selectedFile!.path != null) {
      //   request.files.add(
      //     await http.MultipartFile.fromPath('attachment', _selectedFile!.path!),
      //   );
      // }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Success: ${body['message']}')));
        messageCtrl.clear();
        setState(() {
          if (isEmail) {
            _emailSendToManagers = false;
            _emailSendToFVs = false;
            _emailSendToMembers = false;
            // _selectedFile = null;
          } else {
            _smsSendToManagers = false;
            _smsSendToFVs = false;
            _smsSendToMembers = false;
          }
        });
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed: ${response.body}')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildRecipientCheckbox(
    String title,
    bool value,
    Function(bool?) onChanged,
  ) {
    return CheckboxListTile(
      title: Text(title),
      value: value,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Send Notifications / Email'),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.message), text: 'SMS / Notification'),
              Tab(icon: Icon(Icons.email), text: 'Email'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // SMS / Notification Tab
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Send App Notification (SMS Fallback)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _smsMessageController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        hintText: 'Enter short notification message...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Recipients',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    _buildRecipientCheckbox(
                      'All Managers',
                      _smsSendToManagers,
                      (v) => setState(() => _smsSendToManagers = v ?? false),
                    ),
                    _buildRecipientCheckbox(
                      'All Field Visitors',
                      _smsSendToFVs,
                      (v) => setState(() => _smsSendToFVs = v ?? false),
                    ),
                    _buildRecipientCheckbox(
                      'All Members',
                      _smsSendToMembers,
                      (v) => setState(() => _smsSendToMembers = v ?? false),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : () => _sendWishes(false),
                        icon: _isLoading
                            ? const CircularProgressIndicator()
                            : const Icon(Icons.send),
                        label: Text(
                          _isLoading ? 'Sending...' : 'Send Notification',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Email Tab
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Send Professional Email',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _emailMessageController,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        hintText: 'Enter detailed email content...',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // File Picker
                    // Row(
                    //   children: [
                    //     ElevatedButton.icon(
                    //       onPressed: _pickFile,
                    //       icon: const Icon(Icons.attach_file),
                    //       label: const Text('Attach File'),
                    //       style: ElevatedButton.styleFrom(
                    //         backgroundColor: Colors.grey[800],
                    //         foregroundColor: Colors.white,
                    //       ),
                    //     ),
                    //     const SizedBox(width: 10),
                    //     if (_selectedFile != null)
                    //       Expanded(
                    //         child: Chip(
                    //           label: Text(_selectedFile!.name),
                    //           onDeleted: _removeFile,
                    //         ),
                    //       ),
                    //   ],
                    // ),
                    const SizedBox(height: 20),
                    const Text(
                      'Recipients',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    _buildRecipientCheckbox(
                      'All Managers',
                      _emailSendToManagers,
                      (v) => setState(() => _emailSendToManagers = v ?? false),
                    ),
                    _buildRecipientCheckbox(
                      'All Field Visitors',
                      _emailSendToFVs,
                      (v) => setState(() => _emailSendToFVs = v ?? false),
                    ),
                    _buildRecipientCheckbox(
                      'All Members',
                      _emailSendToMembers,
                      (v) => setState(() => _emailSendToMembers = v ?? false),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : () => _sendWishes(true),
                        icon: _isLoading
                            ? const CircularProgressIndicator()
                            : const Icon(Icons.email),
                        label: Text(_isLoading ? 'Sending...' : 'Send Email'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
