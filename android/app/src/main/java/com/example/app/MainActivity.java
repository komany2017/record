package com.example.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQUEST_WRITE_STORAGE = 1001;
    private static final String PREF_NAME = "perm_prefs";
    private static final String KEY_PROMPTED_ALL_FILES = "prompted_all_files";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestStoragePermissionIfNeeded();
    }

    @Override
    public void onResume() {
        super.onResume();
        // 重新检查所有文件访问权限：用户从系统设置返回后立即生效，
        // 若仍未授权，则提示一次（仅一次，避免循环打扰）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
            boolean prompted = getSharedPreferences(PREF_NAME, MODE_PRIVATE)
                    .getBoolean(KEY_PROMPTED_ALL_FILES, false);
            if (!prompted) {
                getSharedPreferences(PREF_NAME, MODE_PRIVATE)
                        .edit().putBoolean(KEY_PROMPTED_ALL_FILES, true).apply();
                requestAllFilesAccess();
            }
        }
    }

    /**
     * 根据系统版本请求相应的存储权限：
     * - Android 11+ (API 30+)：请求"所有文件访问"权限（MANAGE_EXTERNAL_STORAGE）
     * - Android 6~10 (API 23~29)：运行时请求 WRITE_EXTERNAL_STORAGE
     */
    private void requestStoragePermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                requestAllFilesAccess();
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                        REQUEST_WRITE_STORAGE);
            }
        }
    }

    private void requestAllFilesAccess() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.addCategory("android.intent.category.DEFAULT");
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
            startActivity(intent);
        }
    }
}
