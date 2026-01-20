import 'package:flutter/material.dart';
import '../../services/member_service.dart';

class BulkMessageScreen extends StatefulWidget {
  const BulkMessageScreen({super.key});

  @override
  State<BulkMessageScreen> createState() => _BulkMessageScreenState();
}

class _BulkMessageScreenState extends State<BulkMessageScreen> {
  final TextEditingController _messageController = TextEditingController();

  bool _sendToManagers = false;
  bool _sendToFVs = false;
  bool _sendToMembers = false;
  bool _isLoading = false;

  Future<void> _sendWishes() async {
    if (_messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please enter a message')));
      return;
    }

    if (!_sendToManagers && !_sendToFVs && !_sendToMembers) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one recipient group'),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    // Simulate sending process
    // In production, this would call a backend API
    await Future.delayed(const Duration(seconds: 2));

    int count = 0;
    if (_sendToManagers) count += 5; // Mock count
    if (_sendToFVs) count += 10; // Mock count
    if (_sendToMembers) count += MemberService.getMembers().length;

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Sent "${_messageController.text}" to $count recipients successfully!',
          ),
        ),
      );
      _messageController.clear();
      setState(() {
        _sendToManagers = false;
        _sendToFVs = false;
        _sendToMembers = false;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Send Wishes / Messages')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Compose Message',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _messageController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText:
                    'Enter your wish or message here... (e.g. Happy New Year!)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Select Recipients',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            CheckboxListTile(
              title: const Text('All Managers'),
              value: _sendToManagers,
              onChanged: (val) =>
                  setState(() => _sendToManagers = val ?? false),
            ),
            CheckboxListTile(
              title: const Text('All Field Visitors'),
              value: _sendToFVs,
              onChanged: (val) => setState(() => _sendToFVs = val ?? false),
            ),
            CheckboxListTile(
              title: const Text('All Members'),
              value: _sendToMembers,
              onChanged: (val) => setState(() => _sendToMembers = val ?? false),
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _sendWishes,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
                label: Text(_isLoading ? 'Sending...' : 'Send Message'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
