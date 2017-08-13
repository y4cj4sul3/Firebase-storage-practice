const functions = require('firebase-functions');
const admin = require('firebase-admin');
const gcs = require('@google-cloud/storage')();

admin.initializeApp(functions.config().firebase);

exports.newFileUploaded = functions.storage.object().onChange(e => {
    const object = e.data;
    const fileBucket = object.bucket;
    const filePath = object.name;
    const fileName = filePath.replace(/^.*[\\\/]/, '').split(".");  // fileName[0] => name of file, fileName[1] => type of file
    const resState = object.resourceState;
    const contType = object.contentType;

    if(filePath.startsWith('music/')){
        if(resState === 'not_exists'){
            // deletion event
            console.log(fileName[0] + '.' + fileName[1] + ' removed from storage');

            var ref = admin.database().ref('musicList/' + fileName[0]);
            ref.once('value').then(data => {
                if(data.exists() && data.val().fileType === fileName[1]){
                    ref.remove();
                    console.log('Remove ' + fileName[0] + '.' + fileName[1] + ' from database');
                }
            });
        }else{
            if(!contType.startsWith('audio/')){
                // file is not an audio file
                gcs.bucket(fileBucket).file(filePath).delete();
                console.log(fileName[0] + '.' + fileName[1] + ' is removed from storage');
            }else{
                // add event
                var ref = admin.database().ref('musicList/' + fileName[0]);
                ref.once('value').then(data => {
                    if(data.exists()){
                        if(data.val().fileType !== fileName[1]){
                            // replaced with different type of file
                            gcs.bucket(fileBucket).file('music/' + data.key + '.' + data.val().fileType).delete();
                        }
                        console.log(data.key + '.' + data.val().fileType + ' is replaced by ' + fileName[0] + '.' + fileName[1] + ' in storage');
                    }
                    admin.database().ref('musicList/' + fileName[0]).set({fileType: fileName[1]});
                    console.log('Add ' + fileName[0] + '.' + fileName[1] + ' to database');
                });
            }
        }
    }
});