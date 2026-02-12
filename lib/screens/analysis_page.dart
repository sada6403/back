import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/analysis_service.dart';
import '../services/auth_service.dart';
import '../config/api_config.dart';

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
  String? _selectedUserId;
  String? _selectedUsername;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isDownloading = false;

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
        role: 'it_sector',
        userId: _selectedUserId,
        startDate: _startDate,
        endDate: _endDate,
      );
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

  Future<void> _showMonthPicker() async {
    final DateTime now = DateTime.now();
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? now,
      firstDate: DateTime(2023),
      lastDate: DateTime(2030),
      helpText: 'Select Start Date for Report',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Colors.blueAccent,
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked == null || !mounted) return;

    final DateTime? pickedEnd = await showDatePicker(
      context: context,
      initialDate: picked,
      firstDate: picked,
      lastDate: DateTime(2030),
      helpText: 'Select End Date for Report',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Colors.blueAccent,
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedEnd != null && mounted) {
      setState(() {
        _startDate = picked;
        _endDate = DateTime(
          pickedEnd.year,
          pickedEnd.month,
          pickedEnd.day,
          23,
          59,
          59,
        );
      });
      _loadData();
    }
  }

  Future<void> _downloadReport() async {
    setState(() => _isDownloading = true);
    try {
      final reportUrl = await AnalysisService.downloadAnalysisReport(
        userId: _selectedUserId,
        startDate: _startDate,
        endDate: _endDate,
      );

      if (reportUrl != null && mounted) {
        final fullUrl = ApiConfig.baseUrl.replaceAll('/api', '') + reportUrl;
        final uri = Uri.parse(fullUrl);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open report URL: $fullUrl')),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to generate report')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  String _formatDurationHms(DateTime start, DateTime? end) {
    final endTime = end ?? DateTime.now();
    final duration = endTime.difference(start);

    if (duration.isNegative) return '0s';

    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    final parts = <String>[];
    if (hours > 0) parts.add('${hours}h');
    if (minutes > 0) parts.add('${minutes}m');
    if (seconds > 0 || parts.isEmpty) parts.add('${seconds}s');

    return parts.join(' ');
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFF1F2937),
        appBar: AppBar(
          backgroundColor: const Color(0xFF1F2937),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'IT Sector Analysis',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
              ),
              if (AuthService.role == 'analyzer')
                Text(
                  'Viewing as: Analyzer (Read-Only)',
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Colors.amber,
                  ),
                ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.calendar_month),
              onPressed: _showMonthPicker,
              tooltip: 'Select Month',
            ),
            IconButton(
              icon: _isDownloading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.picture_as_pdf),
              onPressed: _isDownloading ? null : _downloadReport,
              tooltip: 'Download Report',
            ),
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
        final loginTime = DateTime.tryParse(
          session['loginTime'] ?? '',
        )?.toLocal();
        final logoutTime = session['logoutTime'] != null
            ? DateTime.tryParse(session['logoutTime'])?.toLocal()
            : null;

        final durationStr = loginTime != null
            ? _formatDurationHms(loginTime, logoutTime)
            : '0s';

        return Card(
          color: const Color(0xFF374151),
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            onTap: () {
              setState(() {
                _selectedUserId = session['userId'];
                _selectedUsername = session['username'];
              });
              DefaultTabController.of(context).animateTo(1);
              _loadData();
            },
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
                  durationStr,
                  style: GoogleFonts.outfit(
                    color: Colors.greenAccent,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.info_outline,
              size: 48,
              color: Colors.white.withValues(alpha: 0.2),
            ),
            const SizedBox(height: 16),
            Text(
              'Nothing found ${_selectedUsername != null ? 'for $_selectedUsername' : ''}',
              style: GoogleFonts.outfit(
                color: Colors.white54,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (_selectedUserId != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _selectedUserId = null;
                    _selectedUsername = null;
                  });
                  _loadData();
                },
                icon: const Icon(Icons.clear_all),
                label: const Text('Show All Activities'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent.withValues(alpha: 0.2),
                  foregroundColor: Colors.blueAccent,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Column(
      children: [
        if (_selectedUserId != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blueAccent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.blueAccent.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.person_pin,
                  color: Colors.blueAccent,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Filtered View',
                        style: GoogleFonts.outfit(
                          color: Colors.blueAccent,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Showing activities for: ${_selectedUsername ?? _selectedUserId}',
                        style: GoogleFonts.outfit(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _selectedUserId = null;
                      _selectedUsername = null;
                    });
                    _loadData();
                  },
                  icon: const Icon(Icons.close, color: Colors.white54),
                  tooltip: 'Clear Filter',
                ),
              ],
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: _activities.length,
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final activity = _activities[index];
              final time = DateTime.tryParse(
                activity['timestamp'] ?? '',
              )?.toLocal();

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
                                ? DateFormat('MMM dd, hh:mm:ss a').format(time)
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
          ),
        ),
      ],
    );
  }
}
