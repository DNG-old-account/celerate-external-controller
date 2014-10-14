(function() {

  window.S3Upload = (function() {

    S3Upload.prototype.s3_object_name = 'default_name';

    S3Upload.prototype.file_dom_selector = 'file_upload';

    S3Upload.prototype.onFinishS3Put = function() {
      return console.log('base.onFinishS3Put()');
    };

    S3Upload.prototype.onProgress = function(percent, status) {
      return console.log('base.onProgress()', percent, status);
    };

    S3Upload.prototype.onError = function(status) {
      return console.log('base.onError()', status);
    };

    function S3Upload(options) {
      if (options == null) options = {};
      for (option in options) {
        this[option] = options[option];
      }
      this.handleFileSelect(document.getElementById(this.file_dom_selector));
    }

    S3Upload.prototype.handleFileSelect = function(file_element) {
      var f, files, output, _i, _len, _results;
      this.onProgress(0, 'Upload started.');
      files = file_element.files;
      output = [];
      _results = [];
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        f = files[_i];
        _results.push(this.uploadFile(f));
      }
      return _results;
    };

    S3Upload.prototype.createCORSRequest = function(method, url) {
      var xhr;
      xhr = new XMLHttpRequest();
      if (xhr.withCredentials != null) {
        xhr.open(method, url, true);
      } else if (typeof XDomainRequest !== "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
      } else {
        xhr = null;
      }
      return xhr;
    };

    S3Upload.prototype.uploadToS3 = function(file, url) {
      var this_s3upload, xhr;
      this_s3upload = this;
      xhr = this.createCORSRequest('PUT', url);
      if (!xhr) {
        this.onError('CORS not supported');
      } else {
        xhr.onload = function() {
          if (xhr.status === 200) {
            this_s3upload.onProgress(100, 'Upload completed.');
            return this_s3upload.onFinishS3Put();
          } else {
            return this_s3upload.onError('Upload error: ' + xhr.status);
          }
        };
        xhr.onerror = function() {
          return this_s3upload.onError('XHR error.');
        };
        xhr.upload.onprogress = function(e) {
          var percentLoaded;
          if (e.lengthComputable) {
            percentLoaded = Math.round((e.loaded / e.total) * 100);
            return this_s3upload.onProgress(percentLoaded, percentLoaded === 100 ? 'Finalizing.' : 'Uploading.');
          }
        };
      }
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('x-amz-acl', 'public-read');
      return xhr.send(file);
    };

    S3Upload.prototype.uploadFile = function(file) {
      var this_s3upload;
      this_s3upload = this;
      if (typeof this.signedUrl === 'undefined') {
        return this.executeOnSignedUrl(file, function(signedURL, publicURL) {
          return this_s3upload.uploadToS3(file, signedURL, publicURL);
        });
      } else {
        return this_s3upload.uploadToS3(file, this.signedUrl);
      }
    };

    return S3Upload;

  })();

}).call(this);
