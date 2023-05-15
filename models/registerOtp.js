const mongoose = require('mongoose');

const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const otpSchema = new Schema({
    password: {
        type: Number,
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId, ref: 'User'
    },
    expiresAt: {
        type: Number,
        required: true
    }
});




// otpSchema.pre('save', async function (next) {
//     if(!this.isModified('password')) return next();

//     this.password = await bcrypt.hash(this.password, 12);
//     next();
// })

module.exports = mongoose.model('OtpSchema', otpSchema);

