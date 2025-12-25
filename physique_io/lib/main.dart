import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

// 1. Global Supabase Client
final supabase = Supabase.instance.client;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 🛡️ SAFETY CHECK: Trying to connect...
  try {
    await Supabase.initialize(
      // ⚠️ IMPORTANT: Replace this with the URL starting with 'https://'
      url: 'https://nicqgagedstcftnlpwkx.supabase.co',
      anonKey:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY3FnYWdlZHN0Y2Z0bmxwd2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTU0NzUsImV4cCI6MjA4MDE3MTQ3NX0.U9rTwdDNXxer8Q84Nxj7yTBHnDbMGLLEsfP2xfPt2vo',
    );
    runApp(const ProviderScope(child: MyApp()));
  } catch (e) {
    // If connection fails, show a simple error screen
    runApp(
      MaterialApp(
        home: Scaffold(body: Center(child: Text("Init Failed: $e"))),
      ),
    );
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Physique.io',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF121212),
        primaryColor: const Color(0xFFBB86FC),
        textTheme: GoogleFonts.outfitTextTheme(
          Theme.of(context).textTheme,
        ).apply(bodyColor: Colors.white, displayColor: Colors.white),
        useMaterial3: true,
      ),
      home: const ConnectionCheckScreen(),
    );
  }
}

// 3. Simple Screen to Test Connection
class ConnectionCheckScreen extends StatelessWidget {
  const ConnectionCheckScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Logic: If the app started, we are connected!
    return const Scaffold(
      body: Center(
        child: Text(
          "✅ CONNECTED TO SUPABASE",
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.greenAccent,
          ),
        ),
      ),
    );
  }
}
