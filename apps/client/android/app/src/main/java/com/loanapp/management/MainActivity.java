package com.loanapp.management;

import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // Dark background prevents white flash during transitions
        webView.setBackgroundColor(Color.parseColor("#020617"));

        // Read the server URL from the flavor-specific capacitor.config.json
        // This is different for member (has ?app_mode=member) vs business
        String serverUrl = "https://app.finflo.org";
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

        // Build the error page URL with the correct retry URL encoded as a parameter
        final String errorPageUrl = "file:///android_asset/public/error.html?retry_url=" + Uri.encode(serverUrl);

        // Override the WebViewClient to intercept errors BEFORE the default page renders
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Only handle main frame errors (not sub-resources like images/scripts)
                if (request.isForMainFrame()) {
                    // Stop loading immediately — prevents default error page from rendering
                    view.stopLoading();
                    // Load our custom error page with the retry URL as a parameter
                    view.loadUrl(errorPageUrl);
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep finflo URLs and local file URLs inside the WebView
                if (url.startsWith("https://app.finflo.org") ||
                    url.startsWith("https://finflo.org") ||
                    url.startsWith("file:///")) {
                    return false;
                }
                // Let other URLs open in external browser
                return true;
            }
        });
    }
}
