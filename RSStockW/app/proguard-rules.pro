-ignorewarnings
-dontwarn
-dontnote
# Mantém a ponte JavaScript <-> Android
-keepclassmembers class com.flowlabs.rsstockw.WebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
