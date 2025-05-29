
package app.lovable.moneyminder;

import android.database.Cursor;
import android.net.Uri;
import android.provider.Telephony;
import org.json.JSONArray;
import org.json.JSONObject;

public class SMSReader {
    private MainActivity activity;

    public SMSReader(MainActivity activity) {
        this.activity = activity;
    }

    public String readSMS(long fromDate, long toDate) {
        try {
            JSONArray messages = new JSONArray();
            Uri uri = Uri.parse("content://sms/inbox");
            
            String selection = "date >= ? AND date <= ?";
            String[] selectionArgs = new String[]{
                String.valueOf(fromDate),
                String.valueOf(toDate)
            };

            Cursor cursor = activity.getContentResolver().query(
                uri,
                new String[]{"address", "body", "date"},
                selection,
                selectionArgs,
                "date DESC"
            );

            if (cursor != null && cursor.moveToFirst()) {
                do {
                    JSONObject sms = new JSONObject();
                    sms.put("address", cursor.getString(0));
                    sms.put("body", cursor.getString(1));
                    sms.put("date", cursor.getString(2));
                    messages.put(sms);
                } while (cursor.moveToNext());
                
                cursor.close();
            }

            return messages.toString();
        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }
}
