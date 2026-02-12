import 'package:flutter/material.dart';
import '../services/monitoring_service.dart';
import '../services/auth_service.dart';

class ActivityLogsScreen extends StatefulWidget {
  const ActivityLogsScreen({super.key});

  @override
  State<ActivityLogsScreen> createState() => _ActivityLogsScreenState();
}

class _ActivityLogsScreenState extends State<ActivityLogsScreen> {
  bool _isLoading = true;
  String _errorMessage = '';

  List<Map<String, dynamic>> _logs = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalCount = 0;

  // Filters
  String _selectedEventType = '';
  String _selectedRole = '';

  final List<String> _eventTypes = [
    'login',
    'logout',
    'app_open',
    'app_close',
    'ping_missed',
    'token_expired',
    'session_timeout',
  ];

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final response = await MonitoringService.getActivityLogs(
        eventType: _selectedEventType.isEmpty ? null : _selectedEventType,
        role: _selectedRole.isEmpty ? null : _selectedRole,
        page: _currentPage,
        limit: 50,
      );

      if (response['success'] == true) {
        setState(() {
          _logs = List<Map<String, dynamic>>.from(response['data'] ?? []);
          _totalCount = response['total'] ?? 0;
          _totalPages = response['totalPages'] ?? 1;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Failed to load logs';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading logs: $e';
        _isLoading = false;
      });
    }
  }

  Widget _buildFilters() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Filters',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    key: ValueKey(_selectedEventType),
                    initialValue: _selectedEventType.isEmpty
                        ? null
                        : _selectedEventType,
                    decoration: const InputDecoration(
                      labelText: 'Event Type',
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: null,
                        child: Text('All Events'),
                      ),
                      ..._eventTypes.map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type.toUpperCase()),
                        );
                      }),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedEventType = value ?? '';
                        _currentPage = 1;
                      });
                      _loadLogs();
                    },
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _selectedEventType = '';
                      _selectedRole = '';
                      _currentPage = 1;
                    });
                    _loadLogs();
                  },
                  icon: const Icon(Icons.clear),
                  label: const Text('Clear Filters'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogsTable() {
    if (_logs.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Center(child: Text('No activity logs found')),
        ),
      );
    }

    return Card(
      elevation: 4,
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columns: const [
                DataColumn(label: Text('Timestamp')),
                DataColumn(label: Text('User')),
                DataColumn(label: Text('Role')),
                DataColumn(label: Text('Event')),
                DataColumn(label: Text('Details')),
                DataColumn(label: Text('Platform')),
                DataColumn(label: Text('IP Address')),
              ],
              rows: _logs.map((log) {
                return DataRow(
                  cells: [
                    DataCell(Text(log['timestamp'] ?? 'N/A')),
                    DataCell(Text(log['username'] ?? log['userId'] ?? 'N/A')),
                    DataCell(Text(log['role'] ?? 'N/A')),
                    DataCell(
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _getEventColor(log['eventType']),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          (log['eventType'] ?? 'N/A').toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    DataCell(
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 200),
                        child: Text(
                          log['details'] ?? 'N/A',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    DataCell(Text(log['platform'] ?? 'N/A')),
                    DataCell(Text(log['ipAddress'] ?? 'N/A')),
                  ],
                );
              }).toList(),
            ),
          ),
          // Pagination
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total: $_totalCount logs',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chevron_left),
                      onPressed: _currentPage > 1
                          ? () {
                              setState(() {
                                _currentPage--;
                              });
                              _loadLogs();
                            }
                          : null,
                    ),
                    Text('Page $_currentPage of $_totalPages'),
                    IconButton(
                      icon: const Icon(Icons.chevron_right),
                      onPressed: _currentPage < _totalPages
                          ? () {
                              setState(() {
                                _currentPage++;
                              });
                              _loadLogs();
                            }
                          : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getEventColor(String? eventType) {
    switch (eventType) {
      case 'login':
      case 'app_open':
        return Colors.green;
      case 'logout':
      case 'app_close':
        return Colors.blue;
      case 'ping_missed':
      case 'session_timeout':
        return Colors.orange;
      case 'token_expired':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Check if user has access
    final userRole = AuthService.role.toLowerCase();
    final hasAccess = userRole.contains('it') || userRole == 'admin';

    if (!hasAccess) {
      return Scaffold(
        appBar: AppBar(title: const Text('Activity Logs')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text(
                'Access Denied',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('You do not have permission to view this page'),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Logs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLogs,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage.isNotEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(_errorMessage),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadLogs,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: () => _loadLogs(),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  _buildFilters(),
                  const SizedBox(height: 16),
                  const Text(
                    'Activity History',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _buildLogsTable(),
                ],
              ),
            ),
    );
  }
}
