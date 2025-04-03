#include "circom.hpp"
#include "calcwit.hpp"
#define NSignals 17
#define NComponents 3
#define NOutputs 2
#define NInputs 6
#define NVars 11
#define NPublic 4
#define __P__ "21888242871839275222246405745257275088548364400416034343698204186575808495617"

/*
VoterEligibility
*/
void VoterEligibility_b473f43cc1610b4e(Circom_CalcWit *ctx, int __cIdx) {
    FrElement _sigValue[1];
    FrElement _sigValue_1[1];
    FrElement _sigValue_2[1];
    FrElement _sigValue_3[1];
    FrElement _tmp[1];
    FrElement _sigValue_4[1];
    int _compIdx;
    int _in_sigIdx_;
    int _offset;
    int _isRegistered_sigIdx_;
    int _compIdx_1;
    int _in_sigIdx__1;
    int _offset_1;
    int _compIdx_2;
    int _in_sigIdx__2;
    int _offset_2;
    int _isEligible_sigIdx_;
    int _compIdx_3;
    int _in_sigIdx__3;
    int _offset_3;
    int _compIdx_4;
    int _out_sigIdx_;
    int _compIdx_5;
    int _out_sigIdx__1;
    int _valid_sigIdx_;
    int _voterAddress_sigIdx_;
    int _commitment_sigIdx_;
    Circom_Sizes _sigSizes_in;
    Circom_Sizes _sigSizes_in_1;
    Circom_Sizes _sigSizes_in_2;
    Circom_Sizes _sigSizes_in_3;
    _isRegistered_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x62566cd91cc37131LL /* isRegistered */);
    _isEligible_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x2ae0ce238c632a20LL /* isEligible */);
    _valid_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x7d0cfe94310960b1LL /* valid */);
    _voterAddress_sigIdx_ = ctx->getSignalOffset(__cIdx, 0xb9686314c4974613LL /* voterAddress */);
    _commitment_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x5df5731a340b4640LL /* commitment */);
    /* signal input regionHash */
    /* signal input electionId */
    /* signal private input voterAddress */
    /* signal private input region */
    /* signal private input isRegistered */
    /* signal private input isEligible */
    /* signal output valid */
    /* signal output commitment */
    /* component regCheck = IsEqual() */
    /* regCheck.in[0] <== isRegistered */
    _compIdx = ctx->getSubComponentOffset(__cIdx, 0x4e729aa4d3dedf37LL /* regCheck */);
    _in_sigIdx_ = ctx->getSignalOffset(_compIdx, 0x08b73807b55c4bbeLL /* in */);
    _sigSizes_in = ctx->getSignalSizes(_compIdx, 0x08b73807b55c4bbeLL /* in */);
    _offset = _in_sigIdx_;
    ctx->multiGetSignal(__cIdx, __cIdx, _isRegistered_sigIdx_, _sigValue, 1);
    ctx->setSignal(__cIdx, _compIdx, _offset, _sigValue);
    /* regCheck.in[1] <== 1 */
    _compIdx_1 = ctx->getSubComponentOffset(__cIdx, 0x4e729aa4d3dedf37LL /* regCheck */);
    _in_sigIdx__1 = ctx->getSignalOffset(_compIdx_1, 0x08b73807b55c4bbeLL /* in */);
    _sigSizes_in_1 = ctx->getSignalSizes(_compIdx_1, 0x08b73807b55c4bbeLL /* in */);
    _offset_1 = _in_sigIdx__1 + 1*_sigSizes_in_1[1];
    ctx->setSignal(__cIdx, _compIdx_1, _offset_1, (ctx->circuit->constants + 1));
    /* component eligCheck = IsEqual() */
    /* eligCheck.in[0] <== isEligible */
    _compIdx_2 = ctx->getSubComponentOffset(__cIdx, 0x0f3ced3551ec9648LL /* eligCheck */);
    _in_sigIdx__2 = ctx->getSignalOffset(_compIdx_2, 0x08b73807b55c4bbeLL /* in */);
    _sigSizes_in_2 = ctx->getSignalSizes(_compIdx_2, 0x08b73807b55c4bbeLL /* in */);
    _offset_2 = _in_sigIdx__2;
    ctx->multiGetSignal(__cIdx, __cIdx, _isEligible_sigIdx_, _sigValue_1, 1);
    ctx->setSignal(__cIdx, _compIdx_2, _offset_2, _sigValue_1);
    /* eligCheck.in[1] <== 1 */
    _compIdx_3 = ctx->getSubComponentOffset(__cIdx, 0x0f3ced3551ec9648LL /* eligCheck */);
    _in_sigIdx__3 = ctx->getSignalOffset(_compIdx_3, 0x08b73807b55c4bbeLL /* in */);
    _sigSizes_in_3 = ctx->getSignalSizes(_compIdx_3, 0x08b73807b55c4bbeLL /* in */);
    _offset_3 = _in_sigIdx__3 + 1*_sigSizes_in_3[1];
    ctx->setSignal(__cIdx, _compIdx_3, _offset_3, (ctx->circuit->constants + 1));
    /* valid <== regCheck.out * eligCheck.out */
    _compIdx_4 = ctx->getSubComponentOffset(__cIdx, 0x4e729aa4d3dedf37LL /* regCheck */);
    _out_sigIdx_ = ctx->getSignalOffset(_compIdx_4, 0x19f79b1921bbcfffLL /* out */);
    ctx->multiGetSignal(__cIdx, _compIdx_4, _out_sigIdx_, _sigValue_2, 1);
    _compIdx_5 = ctx->getSubComponentOffset(__cIdx, 0x0f3ced3551ec9648LL /* eligCheck */);
    _out_sigIdx__1 = ctx->getSignalOffset(_compIdx_5, 0x19f79b1921bbcfffLL /* out */);
    ctx->multiGetSignal(__cIdx, _compIdx_5, _out_sigIdx__1, _sigValue_3, 1);
    Fr_mul(_tmp, _sigValue_2, _sigValue_3);
    ctx->setSignal(__cIdx, __cIdx, _valid_sigIdx_, _tmp);
    /* commitment <== voterAddress */
    ctx->multiGetSignal(__cIdx, __cIdx, _voterAddress_sigIdx_, _sigValue_4, 1);
    ctx->setSignal(__cIdx, __cIdx, _commitment_sigIdx_, _sigValue_4);
    ctx->finished(__cIdx);
}
/*
IsEqual
in[1]=1
*/
void IsEqual_08a6641e379c6599(Circom_CalcWit *ctx, int __cIdx) {
    FrElement _sigValue[1];
    FrElement _sigValue_1[1];
    FrElement _tmp[1];
    FrElement _sigValue_2[1];
    FrElement _sigValue_3[1];
    FrElement _tmp_1[1];
    FrElement _tmp_2[1];
    int _in_sigIdx_;
    int _offset;
    int _offset_1;
    int _diff_sigIdx_;
    int _out_sigIdx_;
    Circom_Sizes _sigSizes_in;
    _in_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x08b73807b55c4bbeLL /* in */);
    _diff_sigIdx_ = ctx->getSignalOffset(__cIdx, 0xc9fcc6675752105aLL /* diff */);
    _out_sigIdx_ = ctx->getSignalOffset(__cIdx, 0x19f79b1921bbcfffLL /* out */);
    _sigSizes_in = ctx->getSignalSizes(__cIdx, 0x08b73807b55c4bbeLL /* in */);
    /* signal input in[2] */
    /* signal output out */
    /* signal diff */
    /* diff <== in[1] - in[0] */
    _offset = _in_sigIdx_ + 1*_sigSizes_in[1];
    ctx->multiGetSignal(__cIdx, __cIdx, _offset, _sigValue, 1);
    _offset_1 = _in_sigIdx_;
    ctx->multiGetSignal(__cIdx, __cIdx, _offset_1, _sigValue_1, 1);
    Fr_sub(_tmp, _sigValue, _sigValue_1);
    ctx->setSignal(__cIdx, __cIdx, _diff_sigIdx_, _tmp);
    /* out <== 1 - (diff * diff) */
    ctx->multiGetSignal(__cIdx, __cIdx, _diff_sigIdx_, _sigValue_2, 1);
    ctx->multiGetSignal(__cIdx, __cIdx, _diff_sigIdx_, _sigValue_3, 1);
    Fr_mul(_tmp_1, _sigValue_2, _sigValue_3);
    Fr_sub(_tmp_2, (ctx->circuit->constants + 1), _tmp_1);
    ctx->setSignal(__cIdx, __cIdx, _out_sigIdx_, _tmp_2);
    ctx->finished(__cIdx);
}
// Function Table
Circom_ComponentFunction _functionTable[2] = {
     VoterEligibility_b473f43cc1610b4e
    ,IsEqual_08a6641e379c6599
};
