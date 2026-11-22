package com.prostudio.mobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int STORAGE_PERMISSION_REQUEST_CODE = 1002;
    private static final int CREATE_FILE_REQUEST_CODE = 1003;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private byte[] pendingSaveBytes;
    private String pendingSaveFilename;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#18191C"));
            window.setNavigationBarColor(Color.parseColor("#18191C"));
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController wic = window.getInsetsController();
                if (wic != null) {
                    wic.setSystemBarsAppearance(
                            0,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            }
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#18191C"));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() |
                                WindowInsets.Type.displayCutout() |
                                WindowInsets.Type.ime()
                );
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            } else {
                v.setPadding(
                        insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom()
                );
                return insets.consumeSystemWindowInsets();
            }
        });

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#18191C"));
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new ProStudioBridge(this), "ProStudioAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                boolean imageOnly = false;
                String[] acceptTypes = fileChooserParams != null ? fileChooserParams.getAcceptTypes() : null;
                if (acceptTypes != null && acceptTypes.length == 1 && "image/*".equals(acceptTypes[0])) {
                    imageOnly = true;
                }

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                if (imageOnly) {
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                            "image/png", "image/jpeg", "image/webp", "image/avif", "image/gif",
                            "image/bmp", "image/tiff", "image/svg+xml", "image/x-icon",
                            "image/heic", "image/heif", "image/*"
                    });
                } else {
                    // Use */* so Android Gallery, Photos, and Downloads allow picking all image formats, .tga, .dng, .psd, .ttf, .otf, and project files
                    intent.setType("*/*");
                }

                if (fileChooserParams != null && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, "Import from Phone"), FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);
        root.requestApplyInsets();
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "if(window.proStudioMobile && window.proStudioMobile.autoSaveCurrentProject) window.proStudioMobile.autoSaveCurrentProject(true);",
                    null
            );
        }
        super.onPause();
    }

    @Override
    protected void onStop() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "if(window.proStudioMobile && window.proStudioMobile.autoSaveCurrentProject) window.proStudioMobile.autoSaveCurrentProject(true);",
                    null
            );
        }
        super.onStop();
    }

    private boolean checkStoragePerm() {
        if (Build.VERSION.SDK_INT >= 33) {
            return checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
        } else if (Build.VERSION.SDK_INT >= 29) {
            return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        } else {
            return checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
    }

    private void requestStoragePerm() {
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[]{Manifest.permission.READ_MEDIA_IMAGES}, STORAGE_PERMISSION_REQUEST_CODE);
        } else if (Build.VERSION.SDK_INT >= 29) {
            requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST_CODE);
        } else {
            requestPermissions(new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
            }, STORAGE_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == STORAGE_PERMISSION_REQUEST_CODE) {
            final boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            final String msg = granted
                    ? "Storage Permission Granted"
                    : "Scoped MediaStore & System Folder Picker Enabled";
            runOnUiThread(() -> {
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                if (webView != null) {
                    webView.evaluateJavascript(
                            "if(window.onStoragePermissionResult) window.onStoragePermissionResult(true, '" + msg + "');",
                            null
                    );
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                } else {
                    results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else if (requestCode == CREATE_FILE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null && pendingSaveBytes != null) {
                Uri uri = data.getData();
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os != null) {
                        os.write(pendingSaveBytes);
                        os.flush();
                        Toast.makeText(this, "Saved " + pendingSaveFilename + " to selected location", Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(this, "Save failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            pendingSaveBytes = null;
            pendingSaveFilename = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "(function(){ if(window.handleAndroidBack) return Boolean(window.handleAndroidBack()); return false; })()",
                    value -> {
                        if (!"true".equals(value)) {
                            // Move task to background instead of destroying Activity so work stays in RAM + IndexedDB auto-save
                            moveTaskToBack(true);
                        }
                    });
        } else {
            moveTaskToBack(true);
        }
    }

    public class ProStudioBridge {
        private final Context context;

        ProStudioBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void hapticTick() {
            vibrate(8);
        }

        @JavascriptInterface
        public void vibrate(int durationMs) {
            try {
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(
                                Math.max(5, durationMs),
                                VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(Math.max(5, durationMs));
                    }
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public boolean hasStoragePermission() {
            return checkStoragePerm();
        }

        @JavascriptInterface
        public void requestStoragePermission() {
            runOnUiThread(MainActivity.this::requestStoragePerm);
        }

        @JavascriptInterface
        public String saveBase64File(String base64Data, String filename, String mimeType) {
            return saveBase64ToLocation(base64Data, filename, mimeType, "downloads", "ProStudio");
        }

        @JavascriptInterface
        public String saveBase64ToLocation(String base64Data, String filename, String mimeType, String folderChoice, String subfolder) {
            try {
                String clean = base64Data;
                int comma = clean.indexOf(',');
                if (comma >= 0) {
                    clean = clean.substring(comma + 1);
                }
                byte[] bytes = Base64.decode(clean, Base64.DEFAULT);
                String safeSub = (subfolder != null) ? subfolder.replaceAll("[^a-zA-Z0-9_\\-/]", "").trim() : "";

                if ("picker".equalsIgnoreCase(folderChoice)) {
                    pendingSaveBytes = bytes;
                    pendingSaveFilename = filename;
                    runOnUiThread(() -> {
                        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "*/*");
                        intent.putExtra(Intent.EXTRA_TITLE, filename);
                        startActivityForResult(intent, CREATE_FILE_REQUEST_CODE);
                    });
                    return "PICKER_LAUNCHED";
                }

                String baseDir = Environment.DIRECTORY_DOWNLOADS;
                if ("pictures".equalsIgnoreCase(folderChoice)) {
                    baseDir = Environment.DIRECTORY_PICTURES;
                } else if ("dcim".equalsIgnoreCase(folderChoice)) {
                    baseDir = Environment.DIRECTORY_DCIM;
                } else if ("documents".equalsIgnoreCase(folderChoice)) {
                    baseDir = Environment.DIRECTORY_DOCUMENTS;
                }

                String relPath = safeSub.isEmpty() ? baseDir : (baseDir + "/" + safeSub);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = context.getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, relPath);

                    Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                    if ("pictures".equalsIgnoreCase(folderChoice) || "dcim".equalsIgnoreCase(folderChoice)) {
                        if (mimeType != null && mimeType.startsWith("image/") && !mimeType.contains("photoshop")) {
                            collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                        }
                    }

                    Uri itemUri = resolver.insert(collection, values);
                    if (itemUri != null) {
                        try (OutputStream os = resolver.openOutputStream(itemUri)) {
                            if (os != null) {
                                os.write(bytes);
                                os.flush();
                            }
                        }
                        final String savedLabel = relPath + "/" + filename;
                        runOnUiThread(() -> Toast.makeText(
                                context,
                                "Saved to " + savedLabel,
                                Toast.LENGTH_LONG).show());
                        return itemUri.toString();
                    }
                }

                File baseFolder = Environment.getExternalStoragePublicDirectory(baseDir);
                File targetFolder = safeSub.isEmpty() ? baseFolder : new File(baseFolder, safeSub);
                if (!targetFolder.exists()) {
                    targetFolder.mkdirs();
                }
                File outFile = new File(targetFolder, filename);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(bytes);
                    fos.flush();
                }
                final String savedPath = outFile.getAbsolutePath();
                runOnUiThread(() -> Toast.makeText(
                        context,
                        "Saved to " + savedPath,
                        Toast.LENGTH_LONG).show());
                return savedPath;
            } catch (Exception e) {
                final String msg = e.getMessage();
                runOnUiThread(() -> Toast.makeText(
                        context,
                        "Export error: " + msg,
                        Toast.LENGTH_LONG).show());
                return "ERROR: " + msg;
            }
        }
    }
}
