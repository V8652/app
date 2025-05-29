
package app.lovable.moneyminder;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;

public class MainActivity extends BridgeActivity {
    private SMSReader smsReader;
    private static final int SMS_PERMISSION_CODE = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        smsReader = new SMSReader(this);
        
        WebView webView = getBridge().getWebView();
        webView.getSettings().setJavaScriptEnabled(true);
        webView.addJavascriptInterface(new AndroidInterface(), "Android");
        
        requestSMSPermission();
    }

    private void requestSMSPermission() {
        if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_SMS}, SMS_PERMISSION_CODE);
        }
    }

    private class AndroidInterface {
        @JavascriptInterface
        public String readSMS(long fromDate, long toDate) {
            return smsReader.readSMS(fromDate, toDate);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted
            }
        }
    }
}
