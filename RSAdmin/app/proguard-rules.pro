-ignorewarnings
-dontwarn
-dontnote
# Mantém a ponte JavaScript <-> Android
-keepclassmembers class com.flowlabs.rsadmin.WebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
