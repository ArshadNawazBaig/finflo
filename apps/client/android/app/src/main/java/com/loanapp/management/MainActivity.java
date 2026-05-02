package com.loanapp.management;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private String serverUrl = "https://app.finflo.org";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // Dark background prevents white flash during loading/errors
        webView.setBackgroundColor(Color.parseColor("#020617"));

        // Read server URL from the flavor-specific capacitor.config.json
        try {
            InputStream is = getAssets().open("capacitor.config.json");
            byte[] buffer = new byte[is.available()];
            is.read(buffer);
            is.close();
            JSONObject config = new JSONObject(new String(buffer));
            if (config.has("server")) {
                JSONObject server = config.getJSONObject("server");
                if (server.has("url")) {
                    serverUrl = server.getString("url");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Expose the server URL to JavaScript (accessible from error.html)
        // This does NOT replace the WebViewClient — Capacitor's bridge stays intact
        webView.addJavascriptInterface(new WebAppInterface(), "NativeConfig");
    }

    /**
     * JavaScript interface that exposes native config to the web layer.
     * Accessible via window.NativeConfig.getServerUrl() in any page loaded in the WebView.
     */
    public class WebAppInterface {
        @JavascriptInterface
        public String getServerUrl() {
            return serverUrl;
        }
    }
}
