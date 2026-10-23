"""Export the Vakyansh Tamil CTC model (MIT) to ONNX and quantize it to int8 for the worker.
usage: export_onnx.py <hf model dir> <out.onnx>"""
import sys, torch
from transformers import Wav2Vec2ForCTC
from onnxruntime.quantization import quantize_dynamic, QuantType
src, out = sys.argv[1], sys.argv[2]
model = Wav2Vec2ForCTC.from_pretrained(src).eval()
class Logp(torch.nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, audio): return torch.log_softmax(s.m(audio).logits, -1)
x = torch.randn(1, 16000 * 5)
torch.onnx.export(Logp(model), x, out + ".fp32.onnx", input_names=["audio"], output_names=["logp"],
                  dynamic_axes={"audio": {1: "samples"}, "logp": {1: "frames"}}, opset_version=17)
quantize_dynamic(out + ".fp32.onnx", out, weight_type=QuantType.QInt8)
