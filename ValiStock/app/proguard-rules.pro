-ignorewarnings
-dontwarn
-dontnote
# Mantém a ponte JavaScript <-> Android
-keepclassmembers class com.flowlabs.valistock.WebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
