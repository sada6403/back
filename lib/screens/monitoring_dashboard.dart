import 'package:flutter/material.dart';
import 'dart:async';
import '../services/monitoring_service.dart';
import '../services/auth_service.dart';
import '../services/session_service.dart';

class MonitoringDashboard extends StatefulWidget {
  const MonitoringDashboard({super.key});

  @override
  State<MonitoringDashboard> createState() => _MonitoringDashboardState();
}

class _MonitoringDashboardState extends State<MonitoringDashboard> {
  bool _isLoading = true;
  String _errorMessage = '';

  // Stats
  int _totalOnline = 0;
  int _totalAll = 0; // DEBUG: Total online of all roles
  Map<String, int> _onlineByRole = {};
  int _last24hLogins = 0;

  // Online users list
  List<Map<String, dynamic>> _onlineUsers = [];

  // Filters
  final String _selectedRole = '';
  final String _selectedBranch = '';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  // Auto-refresh timer
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadData();
    // Auto-refresh every 30 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _loadData(showLoading: false);
    });

    // Log Screen View
    SessionService.logActivity(
      'SCREEN_VIEW',
      details: 'User Monitoring Dashboard',
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool showLoading = true}) async {
    if (showLoading) {
      setState(() {
        _isLoading = true;
        _errorMessage = '';
      });
    }

    try {
      // Load stats and online users in parallel
      final results = await Future.wait([
        MonitoringService.getStats(),
        MonitoringService.getOnlineUsers(
          role: _selectedRole.isEmpty ? null : _selectedRole,
          branch: _selectedBranch.isEmpty ? null : _selectedBranch,
          search: _searchQuery.isEmpty ? null : _searchQuery,
        ),
      ]);

      final statsResponse = results[0];
      final usersResponse = results[1];

      if (statsResponse['success'] == true) {
        // Recalculate based on filtered online users for consistency with IT Sector focus
        // The original stats from the backend might include all users,
        // but we're filtering the displayed users to IT sector only.
        // So, we'll re-derive totalOnline and onlineByRole from the filtered list.
        _last24hLogins = statsResponse['stats']['last24hLogins'] ?? 0;
      }

      if (usersResponse['success'] == true) {
        final List<dynamic> allUsers = usersResponse['data'] ?? [];
        _totalAll = allUsers.length; // DEBUG: Track total before filter

        _onlineUsers = allUsers
            .map((u) => Map<String, dynamic>.from(u))
            .toList();

        _totalOnline = _onlineUsers
            .length; // Total online is now the count of filtered users
        _onlineByRole =
            {}; // Recalculate online by role based on filtered users
        for (var u in _onlineUsers) {
          final role = u['role'] ?? 'Other';
          _onlineByRole[role] = (_onlineByRole[role] ?? 0) + 1;
        }
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Error loading data: $e';
      });
    }
  }

  Widget _buildStatsCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleBreakdown() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Online by Role',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (_onlineByRole.isEmpty)
              const Text('No users online')
            else
              ..._onlineByRole.entries.map((entry) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(entry.key),
                      Chip(
                        label: Text(entry.value.toString()),
                        backgroundColor: Colors.blue[100],
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersTable() {
    if (_onlineUsers.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Center(child: Text('No online users')),
        ),
      );
    }

    return Card(
      elevation: 4,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Name')),
            DataColumn(label: Text('Role')),
            DataColumn(label: Text('Branch')),
            DataColumn(label: Text('Activity')),
            DataColumn(label: Text('Status')),
            DataColumn(label: Text('Last Seen')),
            DataColumn(label: Text('Device')),
            DataColumn(label: Text('Platform')),
            DataColumn(label: Text('Duration')),
          ],
          rows: _onlineUsers.map((user) {
            return DataRow(
              cells: [
                DataCell(Text(user['username'] ?? user['userId'] ?? 'N/A')),
                DataCell(Text(user['role'] ?? 'N/A')),
                DataCell(Text(user['branchName'] ?? 'N/A')),
                DataCell(
                  Text(
                    user['currentScreen'] ?? 'Home',
                    style: const TextStyle(
                      fontStyle: FontStyle.italic,
                      color: Colors.blueAccent,
                    ),
                  ),
                ),
                DataCell(
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'ONLINE',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                DataCell(Text(user['lastSeen'] ?? 'N/A')),
                DataCell(Text(user['appVersion'] ?? 'N/A')),
                DataCell(Text(user['platform'] ?? 'N/A')),
                DataCell(Text('${user['durationMinutes'] ?? 0} min')),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Check if user has access
    final userRole = AuthService.role.toLowerCase();
    final hasAccess =
        userRole.contains('it') || userRole == 'admin' || userRole == 'manager';

    if (!hasAccess) {
      return Scaffold(
        appBar: AppBar(title: const Text('Monitoring Dashboard')),
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
        title: const Text('User Monitoring'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _loadData(),
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
                    onPressed: () => _loadData(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: () => _loadData(),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // Stats Cards
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatsCard(
                          'Total Online',
                          '$_totalOnline (All: $_totalAll)',
                          Icons.people,
                          Colors.green,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildStatsCard(
                          'Last 24h Logins',
                          _last24hLogins.toString(),
                          Icons.login,
                          Colors.blue,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Role breakdown
                  _buildRoleBreakdown(),
                  const SizedBox(height: 24),

                  // Filters
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Filters',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _searchController,
                            decoration: InputDecoration(
                              labelText: 'Search by name or ID',
                              border: const OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.search),
                                onPressed: () {
                                  setState(() {
                                    _searchQuery = _searchController.text;
                                  });
                                  _loadData();
                                },
                              ),
                            ),
                            onSubmitted: (value) {
                              setState(() {
                                _searchQuery = value;
                              });
                              _loadData();
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Users table
                  const Text(
                    'Online Users',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  _buildUsersTable(),

                  const SizedBox(height: 16),
                  const Text(
                    'Auto-refreshes every 30 seconds',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontStyle: FontStyle.italic,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
    );
  }
}
