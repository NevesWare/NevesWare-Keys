-ignorewarnings
-dontwarn
-dontnote
# Mantém a ponte JavaScript <-> Android
-keepclassmembers class com.flowlabs.rsstock.WebBridge {
    @android.webkit.JavascriptInterface <methods>;
}
