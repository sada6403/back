import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/analysis_service.dart';

class AnalysisPage extends StatefulWidget {
  const AnalysisPage({super.key});

  @override
  State<AnalysisPage> createState() => _AnalysisPageState();
}

class _AnalysisPageState extends State<AnalysisPage> {
  bool _isLoading = true;
  List<dynamic> _sessions = [];
  List<dynamic> _activities = [];
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      final data = await AnalysisService.getAnalysisData(
        role: 'admin',
      ); // Target IT Sector
      if (mounted) {
        setState(() {
          _sessions = data['sessions'] ?? [];
          _activities = data['activities'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFF1F2937),
        appBar: AppBar(
          backgroundColor: const Color(0xFF1F2937),
          title: Text(
            'IT Sector Analysis',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          ),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
          ],
          bottom: TabBar(
            indicatorColor: Colors.blueAccent,
            labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold),
            tabs: const [
              Tab(text: 'Login Sessions'),
              Tab(text: 'Activity Log'),
            ],
          ),
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage.isNotEmpty
            ? Center(
                child: Text(
                  'Error: $_errorMessage',
                  style: GoogleFonts.outfit(color: Colors.red),
                ),
              )
            : TabBarView(
                children: [_buildSessionsList(), _buildActivitiesList()],
              ),
      ),
    );
  }

  Widget _buildSessionsList() {
    if (_sessions.isEmpty) {
      return Center(
        child: Text(
          'No session data found.',
          style: GoogleFonts.outfit(color: Colors.white54),
        ),
      );
    }

    return ListView.builder(
      itemCount: _sessions.length,
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        final session = _sessions[index];
        final loginTime = DateTime.tryParse(session['loginTime'] ?? '');
        final logoutTime = session['logoutTime'] != null
            ? DateTime.tryParse(session['logoutTime'])
            : null;
        final duration = session['durationMinutes'] ?? 0;

        return Card(
          color: const Color(0xFF374151),
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.blueAccent.withValues(alpha: 0.2),
              child: const Icon(Icons.timer, color: Colors.blueAccent),
            ),
            title: Text(
              session['username'] ?? 'Unknown User',
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  'Login: ${loginTime != null ? DateFormat('MMM dd, hh:mm a').format(loginTime) : 'N/A'}',
                  style: GoogleFonts.outfit(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
                Text(
                  'Logout: ${logoutTime != null ? DateFormat('MMM dd, hh:mm a').format(logoutTime) : 'Active / Unknown'}',
                  style: GoogleFonts.outfit(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${duration}m',
                  style: GoogleFonts.outfit(
                    color: Colors.greenAccent,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  'Duration',
                  style: GoogleFonts.outfit(
                    color: Colors.white30,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildActivitiesList() {
    if (_activities.isEmpty) {
      return Center(
        child: Text(
          'No activity logs found.',
          style: GoogleFonts.outfit(color: Colors.white54),
        ),
      );
    }

    return ListView.builder(
      itemCount: _activities.length,
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        final activity = _activities[index];
        final time = DateTime.tryParse(activity['timestamp'] ?? '');

        return Card(
          color: const Color(0xFF374151),
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      activity['action'] ?? 'ACTION',
                      style: GoogleFonts.outfit(
                        color: Colors.orangeAccent,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      time != null
                          ? DateFormat('MMM dd, hh:mm a').format(time)
                          : '',
                      style: GoogleFonts.outfit(
                        color: Colors.white30,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  activity['details'] ?? '',
                  style: GoogleFonts.outfit(color: Colors.white),
                ),
                if (activity['target'] != null &&
                    activity['target'] != 'N/A') ...[
                  const SizedBox(height: 4),
                  Text(
                    'Target: ${activity['target']}',
                    style: GoogleFonts.outfit(
                      color: Colors.white54,
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
