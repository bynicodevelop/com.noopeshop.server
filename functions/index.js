const functions = require("firebase-functions");
const admin = require("firebase-admin")
const _ = require("lodash");

admin.initializeApp();

// exports.onUploadProductFile = functions.storage.object().onFinalize(async (object) => { 
//     const filePath = object.name;
//     // const contentType = object.contentType;

//     // let mediaType = "MediaTypeEnum.video";

//     // if(contentType.startsWith("image/")) {
//     //     mediaType = "MediaTypeEnum.image";
//     // }

//     const productsRef = await admin
//         .firestore()
//         .collection("products")
//         .where("media", "array-contains", filePath)
//         .get();

//     if(productsRef.empty) {
//         return;
//     }

//     const productRef = productsRef.docs[0];

//     const createdAt = admin.firestore.FieldValue.serverTimestamp();

//     await productRef.ref.update({
//         createdAt,
//         updatedAt: createdAt,
//     });
// });

exports.onProductDeleted = functions.firestore.document("products/{productId}").onDelete(async (snapshot) => { 
    const { media } = snapshot.data();

    if(!media) {
        return;
    }

    // TODO: Delete favorites

    const bucket = admin.storage().bucket();

    for(let i = 0; i < media.length; i++) {
        functions.logger.log(`Deleting ${media[i]}`);
        const file = bucket.file(media[i]);
        await file.delete();
    }

    return;
})

exports.onFavoriteCreated = functions.firestore.document("users/{userId}/favorites/{favoriteId}").onCreate(async (snapshot, context) => {
    const {userId, favoriteId} = context.params;

    const favoriteRef = admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("favorites")
        .doc(favoriteId);

    const favorite = await favoriteRef.get();

    await favorite.ref.update({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const { productRef } = favorite.data();

    await productRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(1),
    });
})

exports.onFavoriteDeleted = functions.firestore.document("users/{userId}/favorites/{favoriteId}").onDelete(async (snapshot) => {
    const { productRef } = snapshot.data(); 

    await productRef.update({
        favoritesCount: admin.firestore.FieldValue.increment(-1)
    });
})

const getPayload = async (title, body, data) => { 
    const usersQuerySnapshot = await admin.firestore().collection("users").get();

    const tokens = usersQuerySnapshot.docs.map(doc => {return doc.data().notificationToken});

    const payload = {
        tokens,
        notification: {
            title,
            body,
        },
    };

    if(!_.isEmpty(data)) {
        payload.data = data;
    }

    return payload
}

exports.onNotificationCreated = functions.firestore.document("notifications/{notificationId}").onCreate(async (snapshot) => {
    const { title, body, data, status } = snapshot.data();

    if(status === "pending") {
        return;
    }

    const payload = await getPayload(title, body, data);

    await admin.messaging().sendMulticast(payload);
})

exports.onNotificationUpdated = functions.firestore.document("notifications/{notificationId}").onUpdate(async (snapshot) => {
    const { title, body, data, status } = snapshot.after.data();

    if(status === "pending") {
        return;
    }

    const payload = await getPayload(title, body, data);

    console.log(payload);

    await admin.messaging().sendMulticast(payload);
})