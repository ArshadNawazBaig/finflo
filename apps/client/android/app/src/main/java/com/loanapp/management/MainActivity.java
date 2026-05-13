package com.loanapp.management;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import org.json.JSONObject;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    // Local bundled error page. Loading via file:// guarantees it renders even
    // when there is no network — Capacitor's default errorPath resolves to
    // https://<server-host>/error.html which itself fails to load when offline,
    // letting the WebView fall back to the system "no internet" page.
    private static final String LOCAL_ERROR_URL = "file:///android_asset/public/error.html";

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
        webView.addJavascriptInterface(new WebAppInterface(), "NativeConfig");

        // Replace Capacitor's WebViewClient so main-frame network failures
        // fall through to our bundled error page instead of the system one.
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.stopLoading();
                    view.loadUrl(LOCAL_ERROR_URL);
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                    view.stopLoading();
                    view.loadUrl(LOCAL_ERROR_URL);
                    return;
                }
                super.onReceivedHttpError(view, request, errorResponse);
            }
        });
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
