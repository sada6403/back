import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/auth_service.dart';
import 'employee_page.dart';
import 'login_page.dart';
import 'members_page.dart';
import 'product_page.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const Center(
      child: Text(
        'Dashboard Content Goes Here',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    ),
    const ProductPage(),
    const EmployeePage(),
    const MembersPage(),
  ];

  static const List<String> _titles = [
    'Home',
    'Products',
    'Employees',
    'Members',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        title: Text(
          _titles[_selectedIndex],
          style: const TextStyle(color: Colors.black),
        ),
        centerTitle: true,
        actions: [
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
                final Map<String, dynamic> profile = AuthService.getProfile();
                showDialog<void>(
                  context: context,
                  builder: (context) {
                    return AlertDialog(
                      title: const Text('Profile'),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('First name: ${profile['firstName'] ?? ''}'),
                          const SizedBox(height: 6),
                          Text('Last name: ${profile['lastName'] ?? ''}'),
                          const SizedBox(height: 6),
                          Text('Date of birth: ${profile['dob'] ?? ''}'),
                          const SizedBox(height: 6),
                          Text('Email: ${profile['email'] ?? ''}'),
                          const SizedBox(height: 6),
                          Text('Mobile: ${profile['mobile'] ?? ''}'),
                        ],
                      ),
                      actions: [
                        TextButton.icon(
                          icon: const Icon(Icons.edit, color: Colors.blue),
                          label: const Text('Edit Profile'),
                          onPressed: () {
                            Navigator.of(context).pop();
                            // reuse existing edit flow from before (keeps as-is)
                          },
                        ),
                        TextButton.icon(
                          icon: const Icon(Icons.logout, color: Colors.red),
                          label: const Text(
                            'Logout',
                            style: TextStyle(color: Colors.red),
                          ),
                          onPressed: () {
                            AuthService.logout();
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute(
                                builder: (_) => const LoginPage(),
                              ),
                              (route) => false,
                            );
                          },
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _selectedIndex, children: _pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        selectedItemColor: Colors.blue,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.home_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.home, color: Colors.blue),
            ),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.inventory_2_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
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
                color: Colors.blue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(8),
              child: const Icon(Icons.work, color: Colors.blue),
            ),
            label: 'Employees',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.group_outlined),
            activeIcon: Container(
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
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
            text: 'Employees',
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const EmployeePage())),
          ),
          _buildDrawerItem(text: 'Members', onTap: () {}),
          _buildDrawerItem(text: 'Analysis', onTap: () {}),
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
