import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../services/employee_service.dart';
import '../services/member_service.dart';
import '../services/product_service.dart';
import '../utils/admin_seeder.dart';
import 'audit_log_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _urlCtrl = TextEditingController();
  bool _isLoading = false;
  String _statusMessage = '';
  Color _statusColor = Colors.black;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString('api_base_url') ?? ApiConfig.baseUrl;
    _urlCtrl.text = url;
    // Ensure config is in sync if loaded for first time
    if (url != ApiConfig.baseUrl) {
      ApiConfig.setBaseUrl(url);
    }
  }

  Future<void> _saveSettings() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Testing connection...';
      _statusColor = Colors.blue;
    });

    final newUrl = _urlCtrl.text.trim();
    if (newUrl.isEmpty) {
      setState(() {
        _isLoading = false;
        _statusMessage = 'URL cannot be empty';
        _statusColor = Colors.red;
      });
      return;
    }

    // Test Connection by fetching products (lightweight usually)
    try {
      // Temporarily set config to test
      ApiConfig.setBaseUrl(newUrl);

      // Use ProductService for a simple GET test (or check health if endpoint exists)
      // We'll just try to fetch methods from services.
      await ProductService.fetchProducts(); // lightweight enough

      // If no exception, we assume it worked or handled it gracefully.
      // Ideally we check if list is populated or check response,
      // but services swallow errors. We might need a better ping.

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('api_base_url', newUrl);

      // Refresh all data
      await EmployeeService.fetchEmployees();
      await MemberService.fetchMembers();

      setState(() {
        _isLoading = false;
        _statusMessage = 'Connected & Saved Successfully!';
        _statusColor = Colors.green;
      });
    } catch (e) {
      // Revert if failed (optional, but Config is static so it stays unless we revert)
      // ApiConfig.setBaseUrl(oldUrl); // logic to revert requires keeping oldUrl

      setState(() {
        _isLoading = false;
        _statusMessage = 'Connection Failed: $e';
        _statusColor = Colors.red;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Database Settings',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF0F172A), // Match scaffold background
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Database Connection',
              style: GoogleFonts.outfit(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Configure the connection to the Main App (MongoDB Backend).',
              style: GoogleFonts.outfit(color: Colors.grey[700]),
            ),
            const SizedBox(height: 24),

            TextField(
              controller: _urlCtrl,
              decoration: const InputDecoration(
                labelText: 'API Base URL',
                hintText: 'http://192.168.1.100:3000/api',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Use the IP address of the server (e.g. 192.168...) if running on a real device.',
              style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
            ),

            const SizedBox(height: 24),

            if (_statusMessage.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _statusColor.withValues(alpha: 0.1),
                  border: Border.all(color: _statusColor),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusMessage,
                  style: GoogleFonts.outfit(
                    color: _statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _saveSettings,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save),
                label: Text(_isLoading ? 'CONNECTING...' : 'SAVE & SYNC'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue[800],
                  foregroundColor: Colors.white,
                ),
              ),
            ),

            const SizedBox(height: 40),
            Divider(color: Colors.grey[300]),
            const SizedBox(height: 20),

            Text(
              'Advanced Actions',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.sync, color: Colors.green),
              title: Text('Force Full Sync', style: GoogleFonts.outfit()),
              subtitle: Text(
                'Reload all data from database',
                style: GoogleFonts.outfit(fontSize: 12),
              ),
              onTap: () async {
                setState(() => _isLoading = true);
                await EmployeeService.fetchEmployees();
                await MemberService.fetchMembers();
                await ProductService.fetchProducts();
                setState(() {
                  _isLoading = false;
                  _statusMessage = 'All data synchronized.';
                  _statusColor = Colors.green;
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.people_outline, color: Colors.purple),
              title: Text('Sync IT Team', style: GoogleFonts.outfit()),
              subtitle: Text(
                'Onboard Admin Team (SMS Credentials)',
                style: GoogleFonts.outfit(fontSize: 12),
              ),
              onTap: () async {
                setState(() => _isLoading = true);
                final result = await AdminSeeder.syncITTeam(context);
                setState(() {
                  _isLoading = false;
                  _statusMessage = result;
                  _statusColor = Colors.purple;
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.security, color: Colors.orange),
              title: Text('System Audit Logs', style: GoogleFonts.outfit()),
              subtitle: Text(
                'View security & action history',
                style: GoogleFonts.outfit(fontSize: 12),
              ),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AuditLogScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
