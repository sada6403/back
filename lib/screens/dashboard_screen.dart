import 'dart:io';
import 'dart:async';

import 'package:flutter/material.dart';

import 'package:intl/intl.dart';

import '../services/auth_service.dart';
import '../services/product_service.dart';
import '../services/employee_service.dart';
import '../services/member_service.dart';
import '../services/health_service.dart';
import '../services/session_service.dart';

import 'employee_page.dart';
import 'members_page.dart';
import 'product_page.dart';
import 'profile_screen.dart';
import 'reports/report_screen.dart';
import 'messaging/bulk_message_screen.dart';
import 'settings_screen.dart';
import 'approvals_screen.dart';
import 'analysis_page.dart';
import 'monitoring_dashboard.dart';
import 'transaction_control_screen.dart';
import '../services/monitoring_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  Timer? _timer;
  bool _isDbConnected = false;
  bool _isCheckingDb = true;
  int _totalOnline = 0;
  List<String> _onlineUserNames = [];

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _fetchData();
    // Refresh data every 30 seconds to keep counts live
    _timer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _checkConnectivity();
      _fetchData();
    });

    // Log Screen View
    SessionService.logActivity('SCREEN_VIEW', details: 'Main Dashboard');
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    final connected = await HealthService.checkConnection();
    if (mounted) {
      setState(() {
        _isDbConnected = connected;
        _isCheckingDb = false;
      });
    }
  }

  Future<void> _fetchData() async {
    await ProductService.init();
    await EmployeeService.init();
    await MemberService.init();
    try {
      final statsRes = await MonitoringService.getStats();
      if (statsRes['success'] == true) {
        // We will recalculate totalOnline based on filtered list below
      }
      final onlineRes = await MonitoringService.getOnlineUsers();
      if (onlineRes['success'] == true) {
        final List<dynamic> users = onlineRes['data'] ?? [];
        // Filter to only IT, Admin, and Analyzer users
        final itUsers = users.where((u) {
          final role = (u['role'] ?? '').toString().toLowerCase();
          return role.contains('it') ||
              role.contains('admin') ||
              role.contains('analyzer');
        }).toList();

        _totalOnline = itUsers.length;
        _onlineUserNames = itUsers
            .map(
              (u) =>
                  u['username']?.toString() ??
                  u['userId']?.toString() ??
                  'Unknown',
            )
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching monitoring stats: $e');
    }
    if (mounted) {
      try {
        setState(() {});
      } catch (e) {
        // Safe set state
      }
    }
  }

  List<int> _monthlyNewMembers() {
    final now = DateTime.now();
    final counts = List<int>.filled(12, 0);
    final members = MemberService.getMembers();
    for (final m in members) {
      final jd = m.joinedDate;
      if (jd == null) continue;
      for (int i = 0; i < 12; i++) {
        final monthDate = DateTime(now.year, now.month - 11 + i, 1);
        if (jd.year == monthDate.year && jd.month == monthDate.month) {
          counts[i]++;
        }
      }
    }
    return counts;
  }

  List<int> _monthlyNewEmployees() {
    final now = DateTime.now();
    final counts = List<int>.filled(12, 0);
    final employees = EmployeeService.getEmployees();
    for (final e in employees) {
      final jd = e.joinedDate;
      for (int i = 0; i < 12; i++) {
        final monthDate = DateTime(now.year, now.month - 11 + i, 1);
        if (jd.year == monthDate.year && jd.month == monthDate.month) {
          counts[i]++;
        }
      }
    }
    return counts;
  }

  // ... (keep existing code)

  List<Map<String, dynamic>> _topSellingProducts(int limit) {
    final products = ProductService.getProducts();
    final list = products.map((p) {
      final revenue = p.totalSoldValue - p.totalBoughtValue;
      return {'product': p, 'revenue': revenue};
    }).toList();
    list.sort(
      (a, b) => (b['revenue'] as double).compareTo(a['revenue'] as double),
    );
    return list.take(limit).toList();
  }

  List<Map<String, dynamic>> _salaryHistory() {
    return EmployeeService.getSalaryPayments();
  }

  Widget _cardMetric(
    String title,
    String value, {
    IconData? icon,
    VoidCallback? onTap,
    List<String>? subItems,
  }) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 24, color: Colors.blue),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subItems != null && subItems.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        subItems.take(3).join(', ') +
                            (subItems.length > 3 ? '...' : ''),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.blue,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
      child: Column(
        children: [
          Row(
            children: [
              if (AuthService.role != 'analyzer')
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const BulkMessageScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.send, color: Colors.white),
                    label: const Text('Send Wishes'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              if (AuthService.role != 'analyzer') const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ReportScreen()),
                    );
                  },
                  icon: const Icon(Icons.picture_as_pdf, color: Colors.white),
                  label: const Text('Reports'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              if (AuthService.role != 'analyzer') const SizedBox(width: 8),
              if (AuthService.role != 'analyzer')
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const ApprovalsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.approval, color: Colors.white),
                    label: const Text('Approvals'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange[800],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (AuthService.role != 'analyzer')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const TransactionControlScreen(),
                    ),
                  );
                },
                icon: const Icon(Icons.search, color: Colors.white),
                label: const Text('Transaction Control (Bill Search)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E293B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSystemStatus() {
    return Container(
      margin: const EdgeInsets.all(8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _isCheckingDb
            ? Colors.orange.withValues(alpha: 0.1)
            : _isDbConnected
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.red.withValues(alpha: 0.1),
        border: Border.all(
          color: _isCheckingDb
              ? Colors.orange
              : _isDbConnected
              ? Colors.green
              : Colors.red,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            _isCheckingDb
                ? Icons.refresh
                : _isDbConnected
                ? Icons.check_circle
                : Icons.error,
            color: _isCheckingDb
                ? Colors.orange
                : _isDbConnected
                ? Colors.green
                : Colors.red,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            'System Online',
            style: TextStyle(
              color: _isCheckingDb
                  ? Colors.orange
                  : _isDbConnected
                  ? Colors.green
                  : Colors.red,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          Text(
            _isCheckingDb
                ? 'Database: Checking...'
                : _isDbConnected
                ? 'Database: Connected'
                : 'Database: Disconnected',
            style: TextStyle(
              color: _isCheckingDb
                  ? Colors.orange[800]
                  : _isDbConnected
                  ? Colors.green[800]
                  : Colors.red[800],
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardAnalytics() {
    final memberTotal = MemberService.getMembers().length;
    final memberSeries = _monthlyNewMembers();
    final memberBought = MemberService.getMembers().fold<double>(
      0.0,
      (s, m) => s + m.totalBought,
    );
    final memberSold = MemberService.getMembers().fold<double>(
      0.0,
      (s, m) => s + m.totalSold,
    );
    final employeeTotal = EmployeeService.getEmployees().length;
    final employeeSeries = _monthlyNewEmployees();
    final positionCounts = <String, int>{};
    for (final pos in EmployeeService.roles) {
      positionCounts[pos] = EmployeeService.getEmployees()
          .where((e) => e.position == pos)
          .length;
    }

    return SingleChildScrollView(
      child: Column(
        children: [
          _buildSystemStatus(),
          _buildQuickActions(),

          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final double width = constraints.maxWidth;
                final int crossAxisCount = width > 600 ? 3 : 2;
                return GridView.count(
                  crossAxisCount: crossAxisCount,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  childAspectRatio: width > 600 ? 3.5 : 2.8,
                  children: [
                    _cardMetric('Members', '$memberTotal', icon: Icons.group),
                    _cardMetric(
                      'Total Bought',
                      'LKR ${memberBought.toStringAsFixed(2)}',
                      icon: Icons.shopping_cart,
                    ),
                    _cardMetric(
                      'Total Sold',
                      'LKR ${memberSold.toStringAsFixed(2)}',
                      icon: Icons.store,
                    ),
                    _cardMetric(
                      'Online Now',
                      '$_totalOnline',
                      icon: Icons.online_prediction,
                      subItems: _onlineUserNames,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const MonitoringDashboard(),
                          ),
                        );
                      },
                    ),
                  ],
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Members - New per Month',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 90,
                      child: _MiniLineChart.points(memberSeries),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final double width = constraints.maxWidth;
                final int crossAxisCount = width > 600 ? 4 : 2;
                return GridView.count(
                  crossAxisCount: crossAxisCount,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                  childAspectRatio: width > 600 ? 3.2 : 2.5,
                  children: [
                    _cardMetric(
                      'Staff',
                      '$employeeTotal',
                      icon: Icons.people_alt,
                    ),
                    _cardMetric(
                      'Area Managers',
                      '${positionCounts['Branch Manager'] ?? 0}',
                      icon: Icons.admin_panel_settings,
                    ),
                    _cardMetric(
                      'Field Visitors',
                      '${positionCounts['Field Visitor'] ?? 0}',
                      icon: Icons.hiking,
                    ),
                    _cardMetric(
                      'IT Sector',
                      '${positionCounts['IT Sector'] ?? 0}',
                      icon: Icons.computer,
                    ),
                    _cardMetric(
                      'Analyzers',
                      '${positionCounts['Analyzer'] ?? 0}',
                      icon: Icons.analytics,
                    ),
                  ],
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Staff - New per Month',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 90,
                      child: _MiniLineChart.points(employeeSeries),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Top Selling Products',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._topSellingProducts(5).map((p) {
                      final prod = p['product'];
                      final revenue = p['revenue'] as double;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        title: Text(
                          prod.name,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Net Revenue: LKR ${revenue.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ],
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Stock: ${prod.currentStock} ${prod.unit}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            // Optional: Show status if low stock?
                          ],
                        ),
                        isThreeLine: true,
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(10.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Salary Payout History',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._salaryHistory().take(6).map((rec) {
                      final dt = rec['date'] as DateTime;
                      final total = rec['total'] as double;
                      return ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        title: Text(
                          DateFormat('yyyy-MM-dd').format(dt),
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: Text(
                          'LKR ${total.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  final List<Widget> _pages = [
    Container(), // placeholder for Home/Dashboard - will be built dynamically
    const ProductPage(),
    const EmployeePage(),
    const MembersPage(),
  ];

  @override
  Widget build(BuildContext context) {
    final titles = ['Dashboard', 'Products', 'Staff Management', 'Members'];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.black),
        elevation: 1,
        title: Text(
          titles[_selectedIndex],
          style: const TextStyle(color: Colors.black),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.blueGrey),
            tooltip: 'Database Settings',
            onPressed: () {
              Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: IconButton(
              icon: CircleAvatar(
                radius: 18,
                backgroundColor: Colors.grey[200],
                backgroundImage:
                    (AuthService.avatarPath != null &&
                        AuthService.avatarPath!.isNotEmpty)
                    ? FileImage(File(AuthService.avatarPath!))
                    : null,
                child:
                    (AuthService.avatarPath == null ||
                        AuthService.avatarPath!.isEmpty)
                    ? const Icon(Icons.person, color: Colors.grey)
                    : null,
              ),
              onPressed: () {
                // Navigate to new Profile Screen
                Navigator.of(context)
                    .push(
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    )
                    .then((_) {
                      // Refresh state on return in case avatar changed
                      setState(() {});
                    });
              },
            ),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _selectedIndex == 0
          ? _buildDashboardAnalytics()
          : IndexedStack(index: _selectedIndex, children: _pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        selectedItemColor: Colors.blue,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.dashboard, color: Colors.blue),
            ),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.inventory_2_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.inventory_2, color: Colors.blue),
            ),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.work_outline),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.work, color: Colors.blue),
            ),
            label: 'Staff',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.group_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.group, color: Colors.blue),
            ),
            label: 'Members',
          ),
        ],
      ),
    );
  }
}

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: <Widget>[
          const SizedBox(
            height: 60.0,
            child: DrawerHeader(
              margin: EdgeInsets.zero,
              padding: EdgeInsets.zero,
              child: SizedBox.shrink(),
            ),
          ),
          _buildDrawerItem(
            text: 'DashBoard',
            onTap: () => Navigator.pop(context),
          ),
          _buildDrawerItem(
            text: 'Products',
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const ProductPage())),
          ),
          _buildDrawerItem(
            text: 'Staff Management',
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const EmployeePage())),
          ),
          _buildDrawerItem(text: 'Members', onTap: () {}),
          _buildDrawerItem(
            text: 'Reports',
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const ReportScreen())),
          ),
          if (AuthService.role != 'analyzer')
            _buildDrawerItem(
              text: 'Send Wishes',
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BulkMessageScreen()),
              ),
            ),
          _buildDrawerItem(
            text: 'Analysis',
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const AnalysisPage())),
          ),
          _buildDrawerItem(
            text: 'User Monitoring',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MonitoringDashboard()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({required String text, required VoidCallback onTap}) {
    return ListTile(
      title: Text(text, style: const TextStyle(fontSize: 16)),
      onTap: onTap,
    );
  }
}

// lightweight chart painter
class _MiniLineChart extends StatelessWidget {
  final List<double> seriesA;
  final List<double>? seriesB;
  final List<int>? points;

  const _MiniLineChart._(this.seriesA, this.seriesB, this.points);

  factory _MiniLineChart.points(List<int> pts) {
    return _MiniLineChart._(pts.map((e) => e.toDouble()).toList(), null, pts);
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MiniPainter(seriesA, seriesB),
      size: const Size(double.infinity, double.infinity),
    );
  }
}

class _MiniPainter extends CustomPainter {
  final List<double> a;
  final List<double>? b;
  _MiniPainter(this.a, this.b);

  @override
  void paint(Canvas canvas, Size size) {
    if (a.isEmpty || size.width <= 0 || size.height <= 0) return;

    // Add padding to prevent drawing outside bounds
    const padding = 4.0;
    final drawWidth = size.width - (padding * 2);
    final drawHeight = size.height - (padding * 2);

    final paintA = Paint()
      ..color = Colors.blue
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final paintB = Paint()
      ..color = Colors.green
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final dot = Paint()
      ..color = Colors.blue
      ..style = PaintingStyle.fill;

    final maxVal = a.fold<double>(0.0, (p, e) => e > p ? e : p);
    final span = (maxVal == 0) ? 1.0 : maxVal;
    final stepX = (a.length > 1) ? (drawWidth / (a.length - 1)) : 0.0;

    // Draw series A
    final pathA = Path();
    for (int i = 0; i < a.length; i++) {
      final x = padding + (stepX * i);
      final y = padding + drawHeight - ((a[i] / span) * drawHeight);
      if (i == 0) {
        pathA.moveTo(x, y);
      } else {
        pathA.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 1.5, dot);
    }
    canvas.drawPath(pathA, paintA);

    // Draw series B if present
    if (b != null && b!.isNotEmpty) {
      final maxB = b!.fold<double>(0.0, (p, e) => e > p ? e : p);
      final spanB = (maxB == 0) ? 1.0 : maxB;
      final stepXB = (b!.length > 1) ? (drawWidth / (b!.length - 1)) : 0.0;

      final pathB = Path();
      for (int i = 0; i < b!.length; i++) {
        final x = padding + (stepXB * i);
        final y = padding + drawHeight - ((b![i] / spanB) * drawHeight);
        if (i == 0) {
          pathB.moveTo(x, y);
        } else {
          pathB.lineTo(x, y);
        }
      }
      canvas.drawPath(pathB, paintB);
    }
  }

  @override
  bool shouldRepaint(covariant _MiniPainter oldDelegate) => true;
}
